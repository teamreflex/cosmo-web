import StaffUserName from "@/components/admin/staff-user-name";
import StatusPill from "@/components/objekt/detail/status-pill";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { reportReasonLabel, reportTargetTypeLabel } from "@/lib/client/reports";
import { reportDetailQuery } from "@/lib/queries/reports";
import { cn } from "@/lib/utils";
import { IconEye, IconFlag, IconFlagOff } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useRef } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ReportActions from "./report-actions";
import ReportTarget from "./report-target";

type Props = {
  id: string | undefined;
};

/**
 * The open report beside the queue, or a prompt to pick one.
 */
export default function ReportDetail({ id }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  /**
   * When the detail has wrapped under the queue, bring it into view. A frame
   * later, so the router's own scroll reset can't cancel it.
   */
  useEffect(() => {
    if (id === undefined) return;

    const frame = requestAnimationFrame(() => {
      const el = ref.current;
      const queue = el?.previousElementSibling;
      if (
        el &&
        queue instanceof HTMLElement &&
        el.offsetTop > queue.offsetTop
      ) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [id]);

  return (
    <div
      ref={ref}
      className={cn(
        "flex min-w-0 grow-[2] basis-[560px] scroll-mt-18 flex-col gap-3.5",
        id === undefined && "max-md:hidden",
      )}
    >
      {id === undefined ? (
        <Empty className="border p-8">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconFlag />
            </EmptyMedia>
            <EmptyTitle className="text-base">
              {m.admin_reports_pick()}
            </EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ErrorBoundary
          resetKeys={[id]}
          fallbackRender={({ error }) => (
            <Empty className="border p-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <IconFlagOff />
                </EmptyMedia>
                <EmptyTitle className="text-base">
                  {formatError(error)}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
        >
          <Suspense fallback={<DetailSkeleton />}>
            <Detail id={id} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}

function Detail({ id }: { id: string }) {
  const { data: report } = useSuspenseQuery(reportDetailQuery(id));

  return (
    <>
      <Alert variant="destructive" role="status">
        <IconEye />
        <AlertTitle>{m.admin_reports_staff_view_title()}</AlertTitle>
        <AlertDescription>
          {m.admin_reports_staff_view_description()}
        </AlertDescription>
      </Alert>

      <article className="overflow-hidden rounded-md border bg-card">
        <header className="flex flex-col gap-1.5 border-b px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusPill tone="muted" className="font-sans">
              {reportTargetTypeLabel(report.target.type)}
            </StatusPill>
            <h2 className="text-[15px] font-semibold">
              {reportReasonLabel(report.reason)}
            </h2>
          </div>
          <div className="text-[13px] text-muted-foreground">
            {m.admin_reports_reported_by()}{" "}
            {report.reporter === null ? (
              <b className="font-semibold text-foreground">
                {m.admin_reports_deleted_user()}
              </b>
            ) : (
              <StaffUserName
                user={report.reporter}
                className="font-semibold text-foreground"
              />
            )}
            {" · "}
            <Timestamp date={report.createdAt} relative="long" />
          </div>
          {report.note !== null && (
            <q className="text-[13px] wrap-break-word italic">{report.note}</q>
          )}
        </header>

        <ReportTarget report={report} />
        <ReportActions report={report} />
      </article>
    </>
  );
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-56" />
    </>
  );
}
