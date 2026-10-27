import { partyName } from "@/lib/client/trade-listings";
import type { TradeView } from "@/lib/universal/trades";
import type { TradeSide } from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import { useState } from "react";
import FeedbackLeaveDialog, {
  type FeedbackWindow,
} from "./feedback-leave-dialog";

/**
 * The leave-feedback dialog and what opens it. The dialog keeps the rating
 * window it opened on through a refetch that closes the window, so a
 * refused submit keeps what the viewer wrote.
 */
export function useFeedbackLeave(trade: TradeView, side: TradeSide) {
  const [leaving, setLeaving] = useState<{
    open: boolean;
    feedbackWindow: FeedbackWindow;
  }>();

  return {
    leave: (feedbackWindow: FeedbackWindow) =>
      setLeaving({ open: true, feedbackWindow }),
    dialog: leaving !== undefined && (
      <FeedbackLeaveDialog
        trade={trade}
        side={side}
        name={partyName(trade.parties[otherSide(side)])}
        feedbackWindow={leaving.feedbackWindow}
        open={leaving.open}
        onOpenChange={(open) => setLeaving({ ...leaving, open })}
      />
    ),
  };
}
