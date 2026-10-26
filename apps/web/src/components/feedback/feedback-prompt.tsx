import { m } from "@/i18n/messages";
import { partyName, tradeTimeFormat } from "@/lib/client/trades";
import type { TradeView } from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { TradeSide } from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconStar } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Button } from "../ui/button";
import { Timestamp } from "../ui/timestamp";
import type { FeedbackWindow } from "./feedback-leave-dialog";

type Props = {
  trade: TradeView;
  side: TradeSide;
  /** opens the page's leave-feedback dialog */
  onLeave: (feedbackWindow: FeedbackWindow) => void;
  /** a small "Leave feedback" for an alert that has other actions */
  compact?: boolean;
  /** the alert's other actions, shown beside Leave feedback */
  actions?: ReactNode;
};

/**
 * Where the viewer's feedback stands, under the panel saying how the trade
 * ended: Leave feedback at the alert's right edge while they may rate, or
 * that the window closed with neither rating. Ratings sit beside the trade
 * instead. Below tablet width Leave feedback and the alert's actions move to
 * the phone bar.
 */
export default function FeedbackPrompt({
  trade,
  side,
  onLeave,
  compact,
  actions,
}: Props) {
  const { feedback } = trade;
  const name = partyName(trade.parties[otherSide(side)]);

  if (
    feedback.state !== "open" &&
    feedback.state !== "closed" &&
    actions === undefined
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "mt-2 flex flex-col gap-2 group-has-[>svg]/alert:col-start-2",
        feedback.state === "open" && "max-md:hidden",
      )}
    >
      {(feedback.state === "open" || actions !== undefined) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          {feedback.state === "open" && (
            <Button
              variant="cosmo"
              size={compact ? "sm" : "default"}
              onClick={() => onLeave(feedback)}
            >
              <IconStar />
              {compact ? m.feedback_leave() : m.feedback_leave_for({ name })}
            </Button>
          )}
        </div>
      )}
      {feedback.state === "closed" && (
        <p className="text-sm text-muted-foreground">
          <ParaglideMessage
            message={m.feedback_closed}
            inputs={{ when: "" }}
            markup={{
              time: () => (
                <Timestamp date={feedback.closedAt} format={tradeTimeFormat} />
              ),
            }}
          />
        </p>
      )}
    </div>
  );
}

/**
 * Leave feedback in the phone bar, after the alert's other actions.
 */
export function FeedbackBar({
  trade,
  side,
  onLeave,
  actions,
}: {
  trade: TradeView;
  side: TradeSide;
  onLeave: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 gap-2">
      {actions}
      <Button variant="cosmo" className="h-11 min-w-0 flex-1" onClick={onLeave}>
        <IconStar />
        {/* a long name truncates rather than running off the screen */}
        <span className="truncate">
          {actions === undefined
            ? m.feedback_leave_for({
                name: partyName(trade.parties[otherSide(side)]),
              })
            : m.feedback_leave()}
        </span>
      </Button>
    </div>
  );
}
