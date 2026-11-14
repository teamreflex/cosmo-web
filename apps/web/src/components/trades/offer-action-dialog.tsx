import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatOfferError } from "@/lib/client/trades";
import { $acceptOffer, $endOffer } from "@/lib/functions/trade-offers";
import type { TradeNamedItem } from "@/lib/universal/trades";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import ConfirmActionDialog from "../confirm-action-dialog";

// what a party can do with a pending offer from its page
export type OfferAction = "accept" | "decline" | "withdraw";

const copies = {
  accept: {
    title: m.trade_page_offer_accept_title,
    description: m.trade_page_offer_accept_description,
    confirm: m.trade_page_offer_accept,
    done: m.trade_page_offer_accepted_toast,
    variant: "cosmo",
  },
  decline: {
    title: m.trade_page_offer_decline_title,
    description: m.trade_page_offer_decline_description,
    confirm: m.trade_page_offer_decline,
    done: m.trade_page_offer_declined_toast,
    variant: "destructive",
  },
  withdraw: {
    title: m.trade_page_offer_withdraw_title,
    description: m.trade_page_offer_withdraw_description,
    confirm: m.trade_page_offer_withdraw,
    done: m.trade_page_offer_withdrawn_toast,
    variant: "destructive",
  },
} as const satisfies Record<
  OfferAction,
  {
    title: () => string;
    description: (inputs: { name: string }) => string;
    confirm: () => string;
    done: () => string;
    variant: "cosmo" | "destructive";
  }
>;

type Props = {
  tradeId: string;
  /** the offer's items, which name a token the server refused */
  items: TradeNamedItem[];
  action: OfferAction;
  /** the other party's name */
  name: string;
  /** the listing the offer is on, which the answer also refetches */
  listingId?: string | null;
  /** an offer accepted away from its trade page links to its trade */
  linkTrade?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Confirms accepting, declining or withdrawing a pending offer. It stays
 * open until the answer lands, then the page refetches into the trade or
 * the offer's ending. A token on either side that can no longer be traded
 * is named in the error.
 */
export default function OfferActionDialog({
  tradeId,
  items,
  action,
  name,
  listingId = null,
  linkTrade = false,
  open,
  onOpenChange,
}: Props) {
  const invalidateTrade = useInvalidateTrade(listingId);
  const navigate = useNavigate();
  const copy = copies[action];
  const mutation = useMutation({
    mutationFn: () =>
      action === "accept"
        ? $acceptOffer({ data: { tradeId } })
        : $endOffer({ data: { tradeId, action } }),
    onSuccess: () => {
      toast.success(
        copy.done(),
        action === "accept" && linkTrade
          ? {
              action: {
                label: m.listing_detail_go_to_trade(),
                onClick: () =>
                  void navigate({ to: "/trade/$id", params: { id: tradeId } }),
              },
            }
          : undefined,
      );
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(formatOfferError(error, items));
    },
    onSettled: invalidateTrade,
  });

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title()}
      description={copy.description({ name })}
      cancelLabel={m.common_back()}
      confirmLabel={copy.confirm()}
      variant={copy.variant}
      buttonClassName="max-sm:h-11"
      mutation={mutation}
    />
  );
}
