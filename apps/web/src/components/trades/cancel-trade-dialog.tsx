import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $cancelTrade } from "@/lib/functions/trades";
import { track } from "@/lib/utils";
import type { TradeSide } from "@apollo/database/web/types";
import type { TradePart } from "@apollo/trades/lifecycle";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmActionDialog from "../confirm-action-dialog";

// what cancelling tells a listing's poster, who on a buy listing only pays
const posterDescriptions = {
  send: m.trade_page_cancel_description_poster,
  send_pay: m.trade_page_cancel_description_poster,
  pay: m.trade_page_cancel_description_buying,
} satisfies Record<TradePart, () => string>;

type Props = {
  tradeId: string;
  listingId: string | null;
  /** the viewer's side */
  side: TradeSide;
  /** what the viewer does in the trade */
  part: TradePart;
  /** the other party's name */
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Confirms cancelling a trade nothing has been sent in yet. It stays open
 * until the cancel lands, then the page refetches into its cancelled state.
 */
export default function CancelTradeDialog({
  tradeId,
  listingId,
  side,
  part,
  name,
  open,
  onOpenChange,
}: Props) {
  const invalidateTrade = useInvalidateTrade(listingId);
  const mutation = useMutation({
    mutationFn: () => $cancelTrade({ data: { tradeId } }),
    onSuccess: () => {
      track("cancel-trade");
      toast.success(m.trade_page_cancelled_toast());
      onOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidateTrade,
  });

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.trade_page_cancel_title()}
      description={
        listingId === null
          ? undefined
          : side === "to"
            ? m.trade_page_cancel_description_claimer({ name })
            : posterDescriptions[part]()
      }
      cancelLabel={m.trade_page_cancel_keep()}
      confirmLabel={m.trade_page_cancel()}
      variant="destructive"
      buttonClassName="max-sm:h-11"
      mutation={mutation}
    />
  );
}
