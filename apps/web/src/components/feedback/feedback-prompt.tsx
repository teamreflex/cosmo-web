import { m } from "@/i18n/messages";
import { tradeTimeFormat } from "@/lib/client/trades";
import type { TradeView } from "@/lib/universal/trades";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconStar } from "@tabler/icons-react";
import { AlertAction, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Timestamp } from "../ui/timestamp";
import type { FeedbackWindow } from "./feedback-leave-dialog";

type Props = {
  trade: TradeView;
  /** opens the page's leave-feedback dialog */
  onLeave: (feedbackWindow: FeedbackWindow) => void;
};

/**
 * Where the viewer's feedback stands, inside the alert saying how the trade
 * ended: Leave feedback among the alert's actions while they may rate, or
 * that the window closed with neither rating. Ratings sit beside the trade
 * instead. Below tablet width Leave feedback moves to the phone bar.
 */
export default function FeedbackPrompt({
  trade: { feedback },
  onLeave,
}: Props) {
  switch (feedback.state) {
    case "open":
      return (
        <AlertAction className="max-md:hidden">
          <Button variant="cosmo" size="sm" onClick={() => onLeave(feedback)}>
            <IconStar />
            {m.feedback_leave()}
          </Button>
        </AlertAction>
      );
    case "closed":
      return (
        <AlertDescription className="mt-1.5">
          <ParaglideMessage
            message={m.feedback_closed}
            inputs={{ when: "" }}
            markup={{
              time: () => (
                <Timestamp date={feedback.closedAt} format={tradeTimeFormat} />
              ),
            }}
          />
        </AlertDescription>
      );
    default:
      return null;
  }
}

// Leave feedback in the phone bar
export function FeedbackBar({ onLeave }: { onLeave: () => void }) {
  return (
    <Button variant="cosmo" className="h-11 min-w-0 flex-1" onClick={onLeave}>
      <IconStar />
      {m.feedback_leave()}
    </Button>
  );
}
