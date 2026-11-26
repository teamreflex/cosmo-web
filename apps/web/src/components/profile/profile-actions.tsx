import ReportDialog from "@/components/reports/report-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfileHelp } from "@/hooks/use-profile-help";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { shortAddress } from "@apollo/util";
import { IconCopy, IconDots, IconFlag, IconHelp } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { capsule } from "./capsule";

type Props = {
  address: string;
  // the profile's account, when the viewer may report it
  report: { userId: string; username: string } | undefined;
};

const item = "max-md:min-h-11";

/**
 * The profile header's last capsule, a menu of what can be done with the
 * profile: copy its address, report it, and open the current tab's help. It
 * always holds the copy, so the row ends the same way on every tab.
 */
export default function ProfileActions({ address, report }: Props) {
  const { help } = useProfileHelp();
  const [reportOpen, setReportOpen] = useState(false);
  const [_, copy] = useCopyToClipboard();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            capsule,
            "justify-center px-0 max-md:ms-auto max-md:w-11 md:w-7 md:px-0",
          )}
          aria-label={m.profile_actions()}
        >
          <IconDots aria-hidden className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto min-w-56">
          <DropdownMenuItem
            className={item}
            onClick={() => {
              void copy(address);
              toast.success(m.toast_wallet_address_copied());
            }}
          >
            <IconCopy aria-hidden />
            {m.profile_copy_address()}
            <span className="ms-auto ps-4 font-mono text-xs text-muted-foreground">
              {shortAddress(address)}
            </span>
          </DropdownMenuItem>
          {report !== undefined && (
            <DropdownMenuItem
              className={item}
              onClick={() => setReportOpen(true)}
            >
              <IconFlag aria-hidden />
              {m.report_user({ username: report.username })}
            </DropdownMenuItem>
          )}
          {help !== undefined && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={item} onClick={help.open}>
                <IconHelp aria-hidden />
                {m.common_help()}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {report !== undefined && (
        <ReportDialog
          target={{
            targetType: "user",
            targetId: report.userId,
            label: report.username,
          }}
          open={reportOpen}
          onOpenChange={setReportOpen}
        />
      )}
    </>
  );
}
