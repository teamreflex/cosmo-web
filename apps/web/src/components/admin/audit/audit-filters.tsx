import StaffUserName from "@/components/admin/staff-user-name";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { m } from "@/i18n/messages";
import { auditActionLabel } from "@/lib/client/staff-audit";
import { auditStaffQuery } from "@/lib/queries/staff-audit";
import type { StaffAuditFilters } from "@/lib/universal/schema/staff-audit";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { staffAuditActions } from "@apollo/database/web/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useId } from "react";
import type { ReactNode } from "react";

type Props = PropsWithClassName<{
  filters: StaffAuditFilters;
}>;

/**
 * The log's Staff and Action filters, kept in the URL. Inline beside the
 * title once the content area, which the admin sidebar narrows, fits them.
 * Below that they share a row, and a filter whose value doesn't fit half the
 * width takes a row of its own.
 */
export default function AuditFilters({ filters, className }: Props) {
  const navigate = useNavigate({ from: "/admin/audit" });
  const staffLabelId = useId();
  const actionLabelId = useId();
  const { data: staff } = useSuspenseQuery(auditStaffQuery);

  const staffItems = [
    { value: "everyone", label: m.admin_audit_staff_everyone() },
    ...staff.map((member) => ({
      value: member.id,
      label:
        member.user === null ? (
          m.admin_audit_staff_deleted({ id: member.id.slice(0, 8) })
        ) : (
          <StaffUserName user={member.user} link={false} />
        ),
    })),
  ];
  const actionItems = [
    { value: "all", label: m.admin_audit_action_all() },
    ...staffAuditActions.map((action) => ({ value: action, label: action })),
  ];

  return (
    <div className={cn("flex flex-wrap gap-2 md:@xl:gap-3", className)}>
      <FilterField labelId={staffLabelId} label={m.admin_audit_staff()}>
        <Select
          items={staffItems}
          value={filters.staffId ?? "everyone"}
          onValueChange={(value) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                staff: staff.find((member) => member.id === value)?.id,
              }),
            })
          }
        >
          <SelectTrigger
            aria-labelledby={staffLabelId}
            className="w-full max-md:data-[size=default]:h-10 md:@xl:w-auto md:@xl:min-w-40"
          >
            <SelectValue />
          </SelectTrigger>
          {/* wide enough for a deleted member's id prefix */}
          <SelectContent className="w-auto min-w-(--anchor-width)">
            {staffItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      <FilterField labelId={actionLabelId} label={m.admin_audit_action()}>
        <Select
          items={actionItems}
          value={filters.action ?? "all"}
          onValueChange={(value) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                action: staffAuditActions.find((action) => action === value),
              }),
            })
          }
        >
          <SelectTrigger
            aria-labelledby={actionLabelId}
            className="w-full max-md:data-[size=default]:h-10 md:@xl:w-auto md:@xl:min-w-50"
          >
            <SelectValue />
          </SelectTrigger>
          {/* wide enough for each code and its description */}
          <SelectContent align="end" className="w-auto min-w-(--anchor-width)">
            <SelectItem value="all">{m.admin_audit_action_all()}</SelectItem>
            {staffAuditActions.map((action) => (
              <SelectItem key={action} value={action}>
                <span className="font-mono text-xs">{action}</span>
                <span className="text-xs text-muted-foreground">
                  {auditActionLabel(action)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
    </div>
  );
}

function FilterField({
  labelId,
  label,
  children,
}: {
  labelId: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-[1_1_10rem] flex-col gap-1.5 md:@xl:flex-none md:@xl:flex-row md:@xl:items-center md:@xl:gap-2">
      <span
        id={labelId}
        className="text-xxs font-medium tracking-widest text-muted-foreground uppercase"
      >
        {label}
      </span>
      {children}
    </div>
  );
}
