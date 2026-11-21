import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { formatAmount } from "@/lib/client/trade-listings";
import { $markPaid } from "@/lib/functions/trades";
import type { TradePaymentView } from "@/lib/universal/trades";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import ConfirmActionDialog from "../confirm-action-dialog";
import { Button } from "../ui/button";

type Props = {
  tradeId: string;
  listingId: string | null;
  payment: TradePaymentView;
};

/**
 * The payment's sender marks it paid behind its Mark paid button. It can't
 * be taken back, so it asks first; once it lands the page refetches with
 * the row marked paid, which drops the button.
 */
export default function MarkPaidDialog({ tradeId, listingId, payment }: Props) {
  const invalidateTrade = useInvalidateTrade(listingId);
  const mutation = useMutation({
    mutationFn: () => $markPaid({ data: { tradeId, itemId: payment.id } }),
    onSuccess: () => toast.success(m.trade_page_payment_marked_paid_toast()),
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidateTrade,
  });

  return (
    <ConfirmActionDialog
      trigger={
        <Button size="sm" className="shrink-0">
          {m.trade_page_payment_mark_paid()}
        </Button>
      }
      title={m.trade_page_payment_mark_paid_title({
        amount: formatAmount(payment.amount, payment.currency),
      })}
      confirmLabel={m.trade_page_payment_mark_paid()}
      buttonClassName="max-sm:h-11"
      mutation={mutation}
    />
  );
}
