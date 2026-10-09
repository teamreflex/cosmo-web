import ReportDetail from "@/components/admin/reports/report-detail";
import ReportQueue from "@/components/admin/reports/report-queue";
import StaffRoleMeta from "@/components/admin/staff-role-meta";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { m } from "@/i18n/messages";
import { reportStatusLabel, reportTargetTypeLabel } from "@/lib/client/reports";
import { defineHead } from "@/lib/meta";
import { reportCountsQuery, reportQueueQuery } from "@/lib/queries/reports";
import { reportTargetTypeFilters } from "@/lib/universal/reports";
import type {
  ReportCountsInput,
  ReportQueueFilters,
} from "@/lib/universal/schema/reports";
import { cn } from "@/lib/utils";
import { can } from "@apollo/auth";
import { reportStatuses } from "@apollo/database/web/types";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useId } from "react";
import * as z from "zod";

export const Route = createFileRoute("/admin/reports")({
  validateSearch: z.object({
    status: z.enum(reportStatuses).default("open").catch("open"),
    type: z.enum(reportTargetTypeFilters).optional().catch(undefined),
    report: z.uuid().optional().catch(undefined),
  }),
  loaderDeps: ({ search: { status, type } }) => ({ status, type }),
  // built once here so the loader and the page share the same cache keys
  context: ({ deps }) => ({
    queueFilters: {
      status: deps.status,
      targetType: deps.type,
    } satisfies ReportQueueFilters,
    countsFilters: { targetType: deps.type } satisfies ReportCountsInput,
  }),
  beforeLoad: ({ context }) => {
    if (!can(context.role, { report: ["read"] })) {
      throw redirect({ to: "/admin" });
    }
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        reportCountsQuery(context.countsFilters),
      ),
      context.queryClient.ensureInfiniteQueryData(
        reportQueueQuery(context.queueFilters),
      ),
    ]);
  },
  head: () =>
    defineHead({ title: m.admin_reports_title(), canonical: "/admin/reports" }),
  pendingComponent: PendingComponent,
  component: RouteComponent,
});

function RouteComponent() {
  const { report } = Route.useSearch();
  const { queueFilters } = Route.useRouteContext();

  return (
    <section className="flex flex-col gap-4 p-4">
      <Toolbar />
      <div className="flex flex-wrap items-start gap-4">
        <ReportQueue filters={queueFilters} />
        <ReportDetail id={report} />
      </div>
    </section>
  );
}

/**
 * The status tabs and Type filter; the tab counts follow the Type filter.
 */
function Toolbar() {
  const navigate = Route.useNavigate();
  const typeLabelId = useId();
  const { queueFilters: filters, countsFilters } = Route.useRouteContext();
  const { data: counts } = useSuspenseQuery(reportCountsQuery(countsFilters));

  const typeItems = [
    { value: "all", label: m.admin_reports_type_all() },
    ...reportTargetTypeFilters.map((type) => ({
      value: type,
      label: reportTargetTypeLabel(type),
    })),
  ];

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-4">
      <div className="flex items-baseline gap-3">
        <h1 className="text-lg font-semibold">{m.admin_reports_title()}</h1>
        <StaffRoleMeta className="ml-auto md:hidden" />
      </div>

      {/* phones scroll the tabs edge to edge instead of wrapping them */}
      <div className="-mx-4 no-scrollbar overflow-x-auto px-4 md:mx-0 md:px-0">
        <Tabs
          value={filters.status}
          onValueChange={(value) => {
            const status = reportStatuses.find((option) => option === value);
            if (status !== undefined) {
              void navigate({
                search: (prev) => ({ ...prev, status, report: undefined }),
              });
            }
          }}
        >
          <TabsList className="max-md:h-10">
            {reportStatuses.map((status) => (
              <TabsTrigger key={status} value={status}>
                {reportStatusLabel(status)}
                {status === "open" && (
                  <span
                    className={cn(
                      "tabular-nums",
                      counts.open > 0 && "text-destructive",
                    )}
                  >
                    {counts.open}
                  </span>
                )}
                {status === "escalated" && (
                  <span className="tabular-nums">{counts.escalated}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-2">
        <span
          id={typeLabelId}
          className="text-xxs font-medium tracking-[0.14em] text-muted-foreground uppercase"
        >
          {m.common_type()}
        </span>
        <Select
          items={typeItems}
          value={filters.targetType ?? "all"}
          onValueChange={(value) =>
            void navigate({
              search: (prev) => ({
                ...prev,
                type: reportTargetTypeFilters.find((type) => type === value),
              }),
            })
          }
        >
          <SelectTrigger
            aria-labelledby={typeLabelId}
            className="w-32 max-md:flex-1 max-md:data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function PendingComponent() {
  return (
    <section className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-9 w-40" />
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <Skeleton className="h-96 min-w-0 grow basis-[360px]" />
        <Skeleton className="h-64 min-w-0 grow-[2] basis-[560px] max-md:hidden" />
      </div>
    </section>
  );
}
