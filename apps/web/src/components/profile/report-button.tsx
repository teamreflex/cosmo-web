import ReportDialog from "@/components/reports/report-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { IconFlag } from "@tabler/icons-react";
import { useState } from "react";

type Props = {
  userId: string;
  username: string;
};

/**
 * Flags a profile for moderators.
 */
export default function ReportButton({ userId, username }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground max-md:size-10"
        aria-label={m.report_user({ username })}
        title={m.report_user({ username })}
      >
        <IconFlag className="size-4" />
      </Button>
      <ReportDialog
        target={{ targetType: "user", targetId: userId, label: username }}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
