import StaffUserName from "@/components/admin/staff-user-name";
import { Button } from "@/components/ui/button";
import { Timestamp } from "@/components/ui/timestamp";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import {
  $dismissReport,
  $escalateReport,
  $resolveReport,
} from "@/lib/functions/reports";
import { currentAccountQuery } from "@/lib/queries/core";
import { adminReportsQueryFilter } from "@/lib/queries/reports";
import type { AdminReportDetail } from "@/lib/universal/reports";
import { staffUserText } from "@/lib/universal/staff-users";
import { cn } from "@/lib/utils";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconLoader2 } from "@tabler/icons-react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import BanUserDialog from "./ban-user-dialog";

/**
 * The status actions in their on-screen order; the phone grid spans Escalate
 * across both columns, as moderators see it above Dismiss and Resolve.
 */
const statusActions = {
  escalate: {
    run: $escalateReport,
    label: m.admin_reports_escalate,
    done: m.admin_reports_escalated,
    variant: "outline",
    className: "max-md:col-span-2",
  },
  dismiss: {
    run: $dismissReport,
    label: m.admin_reports_dismiss,
    done: m.admin_reports_dismissed,
    variant: "ghost",
    className: "text-muted-foreground",
  },
  resolve: {
    run: $resolveReport,
    label: m.admin_reports_resolve,
    done: m.admin_reports_resolved,
    variant: "default",
    className: "md:ml-auto",
  },
} as const;

type StatusAction = keyof typeof statusActions;

type Props = {
  report: AdminReportDetail;
};

/**
 * What the viewer's role can do with a report. Admins ban; moderators, who
 * can't, escalate to the admins instead.
 */
export default function ReportActions({ report }: Props) {
  switch (report.status) {
    case "open":
    case "escalated":
      return <OpenActions report={report} />;
    case "resolved":
    case "dismissed": {
      const { resolver } = report;
      return (
        <div className="border-t bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          <ParaglideMessage
            message={
              report.status === "resolved"
                ? m.admin_reports_resolved_by
                : m.admin_reports_dismissed_by
            }
            inputs={{
              name:
                resolver === null
                  ? m.admin_reports_deleted_user()
                  : staffUserText(resolver),
            }}
            markup={{
              user: ({ children }) =>
                resolver === null ? (
                  children
                ) : (
                  <StaffUserName
                    user={resolver}
                    className="font-medium text-foreground"
                  />
                ),
            }}
          />
          {" · "}
          <Timestamp date={report.resolvedAt} relative="long" />
        </div>
      );
    }
  }
}

function OpenActions({ report }: Props) {
  const hasPermission = useHasPermission();
  const queryClient = useQueryClient();
  const [banOpen, setBanOpen] = useState(false);
  const { data: account } = useSuspenseQuery(currentAccountQuery);

  const mutation = useMutation({
    mutationFn: (action: StatusAction) =>
      statusActions[action].run({ data: { id: report.id } }),
    onSuccess: (_, action) => {
      toast.success(statusActions[action].done());
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
    // a lost race also needs the latest status
    onSettled: () => queryClient.invalidateQueries(adminReportsQueryFilter),
  });

  const target = report.target.user;
  const canBan = hasPermission({ user: ["ban"] });
  const banTarget =
    canBan &&
    target !== null &&
    target.id !== account?.user.id &&
    target.ban === null &&
    target.protected === false
      ? target
      : null;
  const showEscalate =
    !canBan &&
    hasPermission({ report: ["escalate"] }) &&
    report.status === "open";
  const canResolve = hasPermission({ report: ["resolve"] });
  const actions = (["escalate", "dismiss", "resolve"] as const).filter(
    (action) => (action === "escalate" ? showEscalate : canResolve),
  );

  return (
    <div className="flex flex-col gap-2.5 border-t bg-muted/40 px-4 py-3">
      <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
        {actionsCaption(canBan, target?.protected === true)}
      </span>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 max-md:grid",
          banTarget === null ? "max-md:grid-cols-2" : "max-md:grid-cols-3",
        )}
      >
        {banTarget !== null && (
          <Button
            variant="destructive"
            size="sm"
            className="max-md:h-10"
            onClick={() => setBanOpen(true)}
            disabled={mutation.isPending}
          >
            {m.admin_reports_ban()}
          </Button>
        )}
        {actions.map((action) => (
          <Button
            key={action}
            variant={statusActions[action].variant}
            size="sm"
            className={cn("max-md:h-10", statusActions[action].className)}
            onClick={() => mutation.mutate(action)}
            disabled={mutation.isPending}
          >
            <span>{statusActions[action].label()}</span>
            {mutation.isPending && mutation.variables === action && (
              <IconLoader2 className="animate-spin" />
            )}
          </Button>
        ))}
      </div>

      {banTarget !== null && (
        <BanUserDialog
          open={banOpen}
          onOpenChange={setBanOpen}
          report={report}
          user={banTarget}
        />
      )}
    </div>
  );
}

/**
 * The action bar's heading, which says why Ban is missing when the viewer
 * could otherwise ban.
 */
function actionsCaption(canBan: boolean, targetProtected: boolean) {
  if (!canBan) {
    return m.admin_reports_actions_no_ban();
  }
  return targetProtected
    ? m.admin_reports_actions_protected()
    : m.admin_reports_actions();
}
