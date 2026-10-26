import FeedbackBody from "@/components/feedback/feedback-body";
import { FeedbackComment } from "@/components/feedback/feedback-text";
import RemoveFeedbackDialog from "@/components/feedback/remove-feedback-dialog";
import { Button } from "@/components/ui/button";
import { Timestamp } from "@/components/ui/timestamp";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { roleLabels } from "@/lib/client/feedback";
import { tradeTimeFormat } from "@/lib/client/trades";
import { adminReportsQueryFilter } from "@/lib/queries/reports";
import type {
  AdminReportDetail,
  ReportTargetFeedback,
} from "@/lib/universal/reports";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { nameInput } from "./name-input";
import { TargetHeader } from "./target-header";

type Props = {
  report: AdminReportDetail;
  feedback: ReportTargetFeedback | null;
};

/**
 * The reported rating: who left it on whom and when, its comment and stars,
 * marked once a moderator removed it, and its removal while the report is
 * open.
 */
export default function FeedbackReport({ report, feedback }: Props) {
  if (feedback === null) {
    return (
      <p className="px-4 py-3.5 text-sm text-muted-foreground">
        {m.admin_reports_feedback_gone()}
      </p>
    );
  }

  const open = report.status === "open" || report.status === "escalated";
  const author = nameInput(feedback.author, "detail");
  const rated = nameInput(feedback.rated, "detail");
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <TargetHeader
        title={m.admin_reports_feedback_title()}
        byline={
          <ParaglideMessage
            message={m.admin_reports_feedback_left_by}
            inputs={{
              author: author.text,
              role: roleLabels[feedback.role](),
              rated: rated.text,
              time: "",
            }}
            markup={{
              author: author.markup,
              rated: rated.markup,
              time: () => (
                <Timestamp date={feedback.createdAt} format={tradeTimeFormat} />
              ),
            }}
          />
        }
        tradeId={feedback.tradeId}
      />

      <FeedbackBody
        entry={feedback}
        as="blockquote"
        className="rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm"
      >
        <FeedbackComment text={feedback.comment} removed={feedback.removed} />
      </FeedbackBody>

      {feedback.removed && (
        <p className="text-xs text-muted-foreground">
          {m.admin_reports_feedback_rating_removed()}
        </p>
      )}
      {open && !feedback.removed && (
        <RemoveFeedback
          reportId={report.id}
          feedbackId={feedback.id}
          ratedName={rated.text}
        />
      )}
    </div>
  );
}

/**
 * Removes the rating once confirmed, which then stops counting towards the
 * rated party's stats, posts a staff event in the trade and resolves this
 * report and the other open reports on it.
 */
function RemoveFeedback({
  reportId,
  feedbackId,
  ratedName,
}: {
  reportId: string;
  feedbackId: string;
  ratedName: string;
}) {
  const hasPermission = useHasPermission();
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState(false);

  if (!hasPermission({ feedback: ["remove-any"] })) return null;

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="w-fit max-md:h-10"
        onClick={() => setRemoving(true)}
      >
        {m.admin_reports_remove_rating()}
      </Button>
      <RemoveFeedbackDialog
        feedbackId={feedbackId}
        reportId={reportId}
        open={removing}
        ratedName={ratedName}
        onClose={() => setRemoving(false)}
        // a lost race also needs the latest state
        onSettled={() =>
          void queryClient.invalidateQueries(adminReportsQueryFilter)
        }
      />
    </>
  );
}
