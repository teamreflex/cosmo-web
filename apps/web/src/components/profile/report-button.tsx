import ReportDialog from "@/components/reports/report-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { myReportQuery } from "@/lib/queries/reports";
import { IconFlag } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

type Props = {
  userId: string;
  username: string;
};

/**
 * Flags a profile for moderators. Once the viewer has an open report on it,
 * the button stays disabled and a caption says so; touch has no hover, so the
 * caption shows at every width instead of a tooltip.
 */
export default function ReportButton({ userId, username }: Props) {
  const [open, setOpen] = useState(false);
  const captionId = useId();
  const { data: report } = useSuspenseQuery(
    myReportQuery({ targetType: "user", targetId: userId }),
  );

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground max-md:size-10"
        aria-label={m.report_user({ username })}
        title={m.report_user({ username })}
        disabled={report !== null}
        aria-describedby={report === null ? undefined : captionId}
      >
        <IconFlag className="size-4" />
      </Button>
      {report !== null && (
        // ordered after the portaled help icon so the icons stay together
        <span
          id={captionId}
          className="order-last ml-1 text-xs text-muted-foreground"
        >
          {report.status === "open"
            ? m.report_already_reported_open({ username })
            : m.report_already_reported_escalated({ username })}
        </span>
      )}
      <ReportDialog
        target={{ targetType: "user", targetId: userId, label: username }}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
