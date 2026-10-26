import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { feedbackReportReasons } from "@apollo/database/web/types";
import { FeedbackComment } from "../feedback/feedback-text";
import { ReportFormDialog, ReportQuote } from "./report-dialog";
import { useCreateReport } from "./use-create-report";

type Props = {
  feedbackId: string;
  /** who left the rating */
  name: string;
  /** the reported text, quoted above the form; null for a rating with no comment */
  text: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Reports a rating to moderators.
 */
export default function ReportFeedbackDialog({
  feedbackId,
  name,
  text,
  open,
  onOpenChange,
}: Props) {
  const report = useCreateReport(onOpenChange);

  return (
    <ReportFormDialog
      title={m.feedback_report_title()}
      description={m.feedback_report_description({
        appName: env.VITE_APP_NAME,
        name,
      })}
      quote={
        <ReportQuote by={name}>
          <FeedbackComment text={text} />
        </ReportQuote>
      }
      reasons={feedbackReportReasons}
      pending={report.pending}
      onSubmit={({ reason, note }) =>
        report.send({
          targetType: "feedback",
          targetId: feedbackId,
          reason,
          note,
        })
      }
      open={open}
      onOpenChange={report.onOpenChange}
    />
  );
}
