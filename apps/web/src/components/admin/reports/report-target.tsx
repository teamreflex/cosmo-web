import StatusPill from "@/components/objekt/detail/status-pill";
import UserAvatar from "@/components/profile/user-avatar";
import { Button } from "@/components/ui/button";
import { Timestamp } from "@/components/ui/timestamp";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { formatError } from "@/lib/client/errors";
import { roleLabel } from "@/lib/client/roles";
import { adminReportsQueryFilter } from "@/lib/queries/reports";
import type {
  AdminReportDetail,
  ReportTargetUser,
} from "@/lib/universal/reports";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
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
          {user.profile === null ? (
            <span className="truncate font-medium">@{user.username}</span>
          ) : (
            <Link
              to="/@{$username}"
              params={{ username: user.profile }}
              className="truncate font-medium hover:underline"
            >
              @{user.username}
            </Link>
          )}
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
 * Lifts a ban through the admin plugin; only roles that can ban see it.
 */
function UnbanButton({ user }: { user: ReportTargetUser }) {
  const hasPermission = useHasPermission();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const result = await authClient.admin.unbanUser({ userId: user.id });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
    },
    onSuccess: async () => {
      toast.success(m.admin_reports_unbanned({ username: user.username }));
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
