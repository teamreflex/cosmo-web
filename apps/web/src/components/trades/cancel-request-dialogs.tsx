import { useInvalidateTrade } from "@/hooks/use-invalidate-trade";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { env } from "@/lib/env/client";
import { $agreeCancel, $requestCancel } from "@/lib/functions/trades";
import { track } from "@/lib/utils";
import type { TradeSide } from "@apollo/database/web/types";
import type { TradePart } from "@apollo/trades/lifecycle";
import {
  IconAlertCircle,
  IconCheck,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { toast } from "sonner";
import ConfirmActionDialog from "../confirm-action-dialog";

/**
 * Why the viewer has to ask rather than cancel: they're owed a payment,
 * something has been sent, or the trade is disputed.
 */
export type CancelAskReason = "payment_due" | "already_started" | "disputed";

const askDescriptions = {
  payment_due: m.trade_page_cancel_ask_description_payment,
  already_started: m.trade_page_cancel_ask_description_sent,
  disputed: m.trade_page_cancel_ask_description_disputed,
} satisfies Record<CancelAskReason, (inputs: { name: string }) => string>;

// what agreeing does to a listing still open, by the viewer's side and whether its poster pays, as cancelling says
function listingLine(side: TradeSide, posterPart: TradePart, name: string) {
  if (side === "to") {
    return posterPart === "pay"
      ? m.trade_page_cancel_description_claimer_buying({ name })
      : m.trade_page_cancel_description_claimer({ name });
  }
  return posterPart === "pay"
    ? m.trade_page_cancel_description_buying()
    : m.trade_page_cancel_description_poster();
}

type Line = { tone: "check" | "alert" | "info"; text: ReactNode };

const lineIcons = {
  check: (
    <IconCheck
      aria-hidden
      className="mt-0.5 size-4 shrink-0 text-teal-600 dark:text-teal-400"
    />
  ),
  alert: (
    <IconAlertCircle
      aria-hidden
      className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
    />
  ),
  info: (
    <IconInfoCircle
      aria-hidden
      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
    />
  ),
};

// nothing sent or paid moves back with a cancel, which both dialogs warn of
const returnsLine = (name: string) =>
  ({
    tone: "alert",
    text: m.trade_page_cancel_returns({ appName: env.VITE_APP_NAME, name }),
  }) satisfies Line;

// what a cancel dialog's choice does, one line each
function Effects({ lines }: { lines: Line[] }) {
  return (
    <ul className="flex flex-col gap-2 text-sm text-foreground/80">
      {lines.map((line, index) => (
        <li key={index} className="flex gap-2.5">
          {lineIcons[line.tone]}
          <span>{line.text}</span>
        </li>
      ))}
    </ul>
  );
}

type Common = {
  tradeId: string;
  listingId: string | null;
  /** the other party's name */
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Asks the other party to agree to cancel, where the viewer can't cancel
 * alone. It says why, that the trade carries on meanwhile, and that
 * anything sent or paid first clears the request.
 */
export function RequestCancelDialog({
  tradeId,
  listingId,
  name,
  reason,
  sent,
  open,
  onOpenChange,
}: Common & {
  reason: CancelAskReason;
  /** whether anything was sent or paid, which no cancel moves back */
  sent: boolean;
}) {
  const invalidateTrade = useInvalidateTrade(listingId);
  const mutation = useMutation({
    mutationFn: () => $requestCancel({ data: { tradeId } }),
    onSuccess: () => {
      track("request-cancel-trade");
      toast.success(m.trade_page_cancel_ask_toast());
      onOpenChange(false);
    },
    onError: (error) => toast.error(formatError(error)),
    onSettled: invalidateTrade,
  });

  return (
    <ConfirmActionDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.trade_page_cancel_ask_title()}
      description={askDescriptions[reason]({ name })}
      cancelLabel={m.trade_page_cancel_keep()}
      confirmLabel={m.trade_page_cancel_ask()}
      variant="destructive"
      buttonClassName="max-sm:h-11"
      mutation={mutation}
    >
      <Effects
        lines={[
          { tone: "check", text: m.trade_page_cancel_ask_notify({ name }) },
          { tone: "check", text: m.trade_page_cancel_ask_carries_on() },
          { tone: "alert", text: m.trade_page_cancel_ask_cleared() },
          ...(sent ? [returnsLine(name)] : []),
        ]}
      />
    </ConfirmActionDialog>
  );
}

/**
 * Agrees to the other party's request, which cancels the trade for both and
 * can't be undone. It warns when something was already sent or paid, since
 * a return is up to the parties, and says a dispute closes with it.
 */
export function AgreeCancelDialog({
  tradeId,
  listingId,
  name,
  side,
  posterPart,
  sent,
  disputed,
  open,
  onOpenChange,
}: Common & {
  side: TradeSide;
  /** what the listing's poster does, which says what agreeing frees on it */
  posterPart: TradePart;
  sent: boolean;
  disputed: boolean;
}) {
  const invalidateTrade = useInvalidateTrade(listingId);
  const mutation = useMutation({
    mutationFn: () => $agreeCancel({ data: { tradeId } }),
    onSuccess: () => {
      track("agree-cancel-trade");
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
      title={m.trade_page_cancel_agree_title()}
      description={m.trade_page_cancel_agree_description({ name })}
      cancelLabel={m.trade_page_cancel_agree_not_yet()}
      confirmLabel={m.trade_page_cancel()}
      variant="destructive"
      buttonClassName="max-sm:h-11"
      mutation={mutation}
    >
      <Effects
        lines={[
          sent
            ? returnsLine(name)
            : { tone: "check", text: m.trade_page_cancel_agree_nothing_sent() },
          ...(disputed
            ? [
                {
                  tone: "check",
                  text: m.trade_page_cancel_agree_dispute(),
                } satisfies Line,
              ]
            : []),
          ...(listingId === null
            ? []
            : [
                {
                  tone: "check",
                  text: listingLine(side, posterPart, name),
                } satisfies Line,
              ]),
          { tone: "info", text: m.trade_page_cancel_agree_no_feedback() },
        ]}
      />
    </ConfirmActionDialog>
  );
}
