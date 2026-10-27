import { m } from "@/i18n/messages";
import { partyName } from "@/lib/client/trade-listings";
import type { FeedbackEntryView } from "@/lib/universal/feedback";
import type { TradeView } from "@/lib/universal/trades";
import type { TradeSide } from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import { IconFlag } from "@tabler/icons-react";
import { useId, useState } from "react";
import ReportFeedbackDialog from "../reports/report-feedback-dialog";
import { Button } from "../ui/button";
import { Timestamp } from "../ui/timestamp";
import FeedbackBody from "./feedback-body";
import { FeedbackComment } from "./feedback-text";

type Props = {
  trade: TradeView;
  side: TradeSide;
};

/**
 * The ratings beside the trade: the one the viewer got, which shows while
 * they can still rate, and the one they left.
 */
export default function TradeFeedback({ trade, side }: Props) {
  const headingId = useId();
  const { feedback } = trade;
  const theirs =
    feedback.state === "open" || feedback.state === "shown"
      ? feedback.theirs
      : null;
  const mine = feedback.state === "shown" ? feedback.mine : null;
  if (theirs === null && mine === null) return null;
  const name = partyName(trade.parties[otherSide(side)]);

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-md border border-border bg-card p-4"
    >
      <h2
        id={headingId}
        className="text-xxs font-medium tracking-widest text-muted-foreground uppercase"
      >
        {m.feedback_section()}
      </h2>
      {theirs !== null && (
        <FeedbackEntry
          entry={theirs}
          title={m.feedback_entry_theirs({ name })}
          name={name}
          theirs
        />
      )}
      {mine !== null && (
        <FeedbackEntry
          entry={mine}
          title={m.feedback_entry_mine({ name })}
          name={name}
        />
      )}
    </section>
  );
}

/**
 * One rating: its sign, who rated whom and when, any comment and its stars.
 * The counterparty's rating can be reported.
 */
function FeedbackEntry({
  entry,
  title,
  name,
  theirs = false,
}: {
  entry: FeedbackEntryView;
  title: string;
  /** the counterparty */
  name: string;
  /** whether the counterparty left it, so the viewer may report it */
  theirs?: boolean;
}) {
  const [reporting, setReporting] = useState(false);
  const reportable = theirs && !entry.removed;

  return (
    <>
      <FeedbackBody entry={entry} className="min-w-0">
        {/* the flag keeps to the first line when the title wraps */}
        <div className="flex items-start gap-2">
          <p className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium wrap-anywhere">{title}</span>
            <Timestamp
              date={entry.createdAt}
              relative="long"
              className="text-xs text-muted-foreground"
            />
          </p>
          {reportable && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground"
              aria-label={m.feedback_report()}
              title={m.feedback_report()}
              onClick={() => setReporting(true)}
            >
              <IconFlag />
            </Button>
          )}
        </div>
        {entry.removed && (
          <p className="text-xs font-medium text-destructive">
            {m.feedback_entry_removed()}
          </p>
        )}
        {entry.comment !== null && (
          <FeedbackComment
            text={entry.comment}
            removed={entry.removed}
            className="text-sm"
          />
        )}
      </FeedbackBody>
      {reportable && (
        <ReportFeedbackDialog
          feedbackId={entry.id}
          name={name}
          text={entry.comment}
          open={reporting}
          onOpenChange={setReporting}
        />
      )}
    </>
  );
}
