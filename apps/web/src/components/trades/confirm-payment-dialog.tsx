import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { formatAmount, paymentMethodLabel } from "@/lib/client/trade-listings";
import { $confirmPayment } from "@/lib/functions/trades";
import type { TradePaymentView } from "@/lib/universal/trades";
import { type PaymentMethod, paymentMethods } from "@apollo/database/web/types";
import { useMutation } from "@tanstack/react-query";
import { useId, useState } from "react";
import { toast } from "sonner";
import ConfirmActionDialog from "../confirm-action-dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

type Props = {
  tradeId: string;
  listingId: string | null;
  payment: TradePaymentView;
  /** the methods the listing accepts, one of which the payment came by */
  methods: PaymentMethod[];
  /** the payment's sender as the page names them */
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * The payment's recipient says it arrived and picks which of the listing's
 * methods it came by, preselected when the listing takes only one. It
 * can't be taken back, so the dialog waits on the answer; a confirmation
 * that settles the trade completes it, and the page refetches either way.
 */
export default function ConfirmPaymentDialog({
  tradeId,
  listingId,
  payment,
  methods,
  name,
  open,
  onOpenChange,
}: Props) {
  const labelId = useId();
  const [only] = methods;
  const [method, setMethod] = useState<PaymentMethod | null>(
    methods.length === 1 && only !== undefined ? only : null,
  );
  const invalidateTrade = useInvalidateTrade(listingId);
  const mutation = useMutation({
    mutationFn: () => {
      // the confirm button stays disabled until a method is picked
      if (method === null) throw new Error("no payment method picked");
      return $confirmPayment({
        data: { tradeId, itemId: payment.id, method },
      });
    },
    onSuccess: () => {
      toast.success(m.trade_page_payment_confirmed_toast());
      onOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidateTrade,
  });

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.trade_page_payment_confirm_title({
        amount: formatAmount(payment.amount, payment.currency),
      })}
      description={m.trade_page_payment_confirm_description({ name })}
      confirmLabel={m.trade_page_payment_mark_received()}
      buttonClassName="max-sm:h-11"
      disabled={method === null}
      mutation={mutation}
    >
      <div className="flex flex-col gap-2.5">
        <span id={labelId} className="text-sm font-medium">
          {m.trade_page_payment_confirm_method()}
        </span>
        <RadioGroup
          aria-labelledby={labelId}
          value={method}
          onValueChange={(value) =>
            setMethod(paymentMethods.find((each) => each === value) ?? null)
          }
          className="grid-cols-2 gap-2"
        >
          {paymentMethods
            .filter((each) => methods.includes(each))
            .map((each) => (
              <Label
                key={each}
                className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 has-data-checked:border-cosmo/60 has-data-checked:bg-cosmo/10"
              >
                <RadioGroupItem value={each} />
                {paymentMethodLabel(each)}
              </Label>
            ))}
        </RadioGroup>
      </div>
    </ConfirmActionDialog>
  );
}
