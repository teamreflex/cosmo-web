import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $cancelTrade } from "@/lib/functions/trades";
import type { TradeSide } from "@apollo/database/web/types";
import { useMutation } from "@tanstack/react-query";
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
import { Spinner } from "../ui/spinner";

type Props = {
  tradeId: string;
  listingId: string | null;
  /** the viewer's side */
  side: TradeSide;
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
  name,
  open,
  onOpenChange,
}: Props) {
  const invalidateTrade = useInvalidateTrade(listingId);
  const mutation = useMutation({
    mutationFn: () => $cancelTrade({ data: { tradeId } }),
    onSuccess: () => {
      toast.success(m.trade_page_cancelled_toast());
      onOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidateTrade,
  });

  return (
    <AlertDialog
      open={open}
      // a cancel can't be called back, so the dialog waits for its answer
      onOpenChange={(next) => {
        if (!mutation.isPending) onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.trade_page_cancel_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {listingId === null
              ? m.trade_page_cancel_description()
              : side === "from"
                ? m.trade_page_cancel_description_poster()
                : m.trade_page_cancel_description_claimer({ name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="max-sm:h-11"
            disabled={mutation.isPending}
          >
            {m.trade_page_cancel_keep()}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            className="max-sm:h-11"
            onClick={(event) => {
              event.preventBaseUIHandler();
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Spinner />}
            {m.trade_page_cancel()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
