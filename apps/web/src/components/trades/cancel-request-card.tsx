import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $declineCancel, $withdrawCancel } from "@/lib/functions/trades";
import { IconAlertCircle, IconClock } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";

type Props = {
  tradeId: string;
  listingId: string | null;
  /** the other party's name */
  name: string;
  /**
   * The viewer's own request, which they may take back, or the other
   * party's, which they keep the trade over or agree to. A button shows only
   * while the server would allow it.
   */
  request:
    | { mine: true; withdraw: boolean }
    | {
        mine: false;
        decline: boolean;
        agree: boolean;
        /** Agree waits on an arrival the drain is recording, which may clear the request */
        recording: boolean;
      };
  onAgree: () => void;
};

/**
 * A waiting request to cancel, above the trade's transfers. Taking it back
 * or keeping the trade only clears the request, so neither asks first;
 * agreeing opens its dialog.
 */
export default function CancelRequestCard({
  tradeId,
  listingId,
  name,
  request,
  onAgree,
}: Props) {
  const invalidateTrade = useInvalidateTrade(listingId);
  const mutation = useMutation({
    mutationFn: () =>
      request.mine
        ? $withdrawCancel({ data: { tradeId } })
        : $declineCancel({ data: { tradeId } }),
    onSuccess: () =>
      toast.success(
        request.mine
          ? m.trade_page_cancel_request_withdrawn_toast()
          : m.trade_page_cancel_request_declined_toast(),
      ),
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidateTrade,
  });
  const button = "max-md:h-11 max-md:flex-1";

  if (request.mine) {
    return (
      <Alert>
        <IconClock />
        <AlertTitle>{m.trade_page_cancel_request_mine_title()}</AlertTitle>
        <AlertDescription>
          {m.trade_page_cancel_request_mine_description({ name })}
        </AlertDescription>
        {request.withdraw && (
          <AlertAction className="max-md:w-full">
            <Button
              variant="outline"
              size="sm"
              className={button}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {m.trade_page_cancel_request_withdraw()}
            </Button>
          </AlertAction>
        )}
      </Alert>
    );
  }

  return (
    <Alert variant="warning">
      <IconAlertCircle />
      <AlertTitle>
        {m.trade_page_cancel_request_theirs_title({ name })}
      </AlertTitle>
      <AlertDescription>
        {m.trade_page_cancel_request_theirs_description()}
      </AlertDescription>
      {(request.decline || request.agree || request.recording) && (
        <AlertAction className="max-md:w-full">
          {request.decline && (
            <Button
              variant="outline"
              size="sm"
              className={button}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {m.trade_page_cancel_keep()}
            </Button>
          )}
          {(request.agree || request.recording) && (
            <Button
              variant="destructive"
              size="sm"
              className={button}
              disabled={mutation.isPending || !request.agree}
              title={
                request.agree
                  ? undefined
                  : m.trade_error_trade_transfer_pending()
              }
              onClick={onAgree}
            >
              {m.trade_page_cancel_request_agree()}
            </Button>
          )}
        </AlertAction>
      )}
    </Alert>
  );
}
