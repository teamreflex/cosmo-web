import StaffUserName from "@/components/admin/staff-user-name";
import StatusPill from "@/components/objekt/detail/status-pill";
import UserAvatar from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { Timestamp } from "@/components/ui/timestamp";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { roleLabel } from "@/lib/client/roles";
import { $unbanUser } from "@/lib/functions/staff-users";
import { adminReportsQueryFilter } from "@/lib/queries/reports";
import type {
  AdminReportDetail,
  ReportTargetUser,
} from "@/lib/universal/reports";
import { staffUserText } from "@/lib/universal/staff-users";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  report: AdminReportDetail;
};

/**
 * Who was reported, with their role, ban state and other open reports.
 */
export default function ReportTarget({ report }: Props) {
  const user = report.target.user;

  if (user === null) {
    return (
      <p className="px-4 py-3.5 text-sm text-muted-foreground">
        {m.admin_reports_deleted_user()}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <UserAvatar username={user.username} className="size-8 **:p-1" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <StaffUserName user={user} className="font-medium" />
          <StatusPill tone="muted" className="font-sans">
            {roleLabel(user.role)}
          </StatusPill>
        </div>
        <TargetMeta
          user={user}
          otherOpenReportCount={report.otherOpenReportCount}
        />
      </div>
      {user.ban !== null && user.protected === false && (
        <UnbanButton user={user} />
      )}
    </div>
  );
}

function TargetMeta({
  user,
  otherOpenReportCount,
}: {
  user: ReportTargetUser;
  otherOpenReportCount: number;
}) {
  if (user.ban === null && otherOpenReportCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
      {user.ban !== null && (
        <span className="text-destructive">
          {user.ban.until === null ? (
            m.admin_reports_banned_permanently()
          ) : (
            <>
              {m.admin_reports_banned_until()}{" "}
              <Timestamp
                date={user.ban.until}
                format={{ dateStyle: "medium" }}
              />
            </>
          )}
        </span>
      )}
      {user.ban !== null && otherOpenReportCount > 0 && (
        <span aria-hidden="true">·</span>
      )}
      {otherOpenReportCount > 0 && (
        <span>
          {m.admin_reports_other_open({ count: otherOpenReportCount })}
        </span>
      )}
    </div>
  );
}

/**
 * Lifts a ban; only roles that can ban see it.
 */
function UnbanButton({ user }: { user: ReportTargetUser }) {
  const hasPermission = useHasPermission();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => $unbanUser({ data: { userId: user.id } }),
    onSuccess: async () => {
      toast.success(
        m.admin_reports_unbanned({ username: staffUserText(user) }),
      );
      await queryClient.invalidateQueries(adminReportsQueryFilter);
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  if (!hasPermission({ user: ["ban"] })) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="ml-auto shrink-0"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <span>{m.admin_reports_unban()}</span>
      {mutation.isPending && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
