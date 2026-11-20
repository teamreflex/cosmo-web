import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { formatAmount, paymentMethodLabel } from "@/lib/client/trade-listings";
import { $confirmPayment } from "@/lib/functions/trades";
import type { TradePaymentView } from "@/lib/universal/trades";
import { type PaymentMethod, paymentMethods } from "@apollo/database/web/types";
import { useMutation } from "@tanstack/react-query";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Spinner } from "../ui/spinner";

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
  // a second click before the first re-renders the button disabled sends nothing
  const submitting = useRef(false);
  const invalidateTrade = useInvalidateTrade(listingId);
  const mutation = useMutation({
    mutationFn: (picked: PaymentMethod) =>
      $confirmPayment({
        data: { tradeId, itemId: payment.id, method: picked },
      }),
    onSuccess: () => {
      toast.success(m.trade_page_payment_confirmed_toast());
      onOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: () => {
      submitting.current = false;
      return invalidateTrade();
    },
  });

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next, details) => {
        if (mutation.isPending) details.cancel();
        else onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.trade_page_payment_confirm_title({
              amount: formatAmount(payment.amount, payment.currency),
            })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.trade_page_payment_confirm_description({ name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
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
        <AlertDialogFooter>
          <AlertDialogCancel
            className="max-sm:h-11"
            disabled={mutation.isPending}
          >
            {m.common_cancel()}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            className="max-sm:h-11"
            // the action is a Close part, and the dialog stays open while the mutation runs
            onClick={(event) => {
              event.preventBaseUIHandler();
              if (method === null || submitting.current) return;
              submitting.current = true;
              mutation.mutate(method);
            }}
            disabled={method === null || mutation.isPending}
          >
            {mutation.isPending && <Spinner />}
            {m.trade_page_payment_mark_received()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
