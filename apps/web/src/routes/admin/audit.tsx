import AuditFilters from "@/components/admin/audit/audit-filters";
import AuditLog from "@/components/admin/audit/audit-log";
import AdminNoAccess from "@/components/admin/no-access";
import StaffRoleMeta from "@/components/admin/staff-role-meta";
import { Skeleton } from "@/components/ui/skeleton";
import { requirePermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { defineHead } from "@/lib/meta";
import { auditStaffQuery, staffAuditQuery } from "@/lib/queries/staff-audit";
import type { StaffAuditFilters } from "@/lib/universal/schema/staff-audit";
import { staffAuditActions } from "@apollo/database/web/types";
import { createFileRoute } from "@tanstack/react-router";
import * as z from "zod";

export const Route = createFileRoute("/admin/audit")({
  validateSearch: z.object({
    staff: z.string().min(1).optional().catch(undefined),
    action: z.enum(staffAuditActions).optional().catch(undefined),
  }),
  loaderDeps: ({ search: { staff, action } }) => ({ staff, action }),
  // built once here so the loader and the log share the same cache key
  context: ({ deps }) => ({
    auditFilters: {
      staffId: deps.staff,
      action: deps.action,
    } satisfies StaffAuditFilters,
  }),
  beforeLoad: ({ context }) =>
    requirePermission(context.role, [{ audit: ["read"] }]),
  notFoundComponent: AdminNoAccess,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query({ ...auditStaffQuery, staleTime: "static" }),
      context.queryClient.infiniteQuery({
        ...staffAuditQuery(context.auditFilters),
        staleTime: "static",
      }),
    ]);
  },
  head: () =>
    defineHead({ title: m.admin_audit_title(), canonical: "/admin/audit" }),
  pendingComponent: PendingComponent,
  component: RouteComponent,
});

function RouteComponent() {
  const { auditFilters } = Route.useRouteContext();

  return (
    <section className="@container flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-3 md:@xl:flex-row md:@xl:flex-wrap md:@xl:items-center md:@xl:gap-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold">{m.admin_audit_title()}</h1>
            <StaffRoleMeta className="ml-auto md:hidden" />
          </div>
          <p className="text-xs text-muted-foreground">
            {m.admin_audit_description()}
          </p>
        </div>
        <AuditFilters filters={auditFilters} className="md:@xl:ml-auto" />
      </div>

      <AuditLog filters={auditFilters} />

      <p className="text-xs text-muted-foreground">
        {m.admin_audit_footnote()}
      </p>
    </section>
  );
}

function PendingComponent() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-9 w-40 md:ml-auto" />
        <Skeleton className="h-9 w-50" />
      </div>
      <Skeleton className="h-96" />
    </section>
  );
}
