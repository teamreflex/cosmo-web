import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { systemStatusQuery } from "@/lib/queries/system";
import type {
  MetadataStatus,
  SystemStatus as SystemStatusType,
} from "@/lib/universal/system";
import { cn } from "@/lib/utils";
import {
  IconActivity,
  IconServer,
  IconWorld,
  IconX,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export default function SystemStatus() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense
        fallback={
          <div className="h-7 w-8 animate-pulse rounded-sm bg-secondary lg:h-8 lg:w-9" />
        }
      >
        <SystemStatusPopover />
      </Suspense>
    </ErrorBoundary>
  );
}

function SystemStatusPopover() {
  const {
    data: { processor, metadata },
  } = useSuspenseQuery(systemStatusQuery);

  // the dot scales to the worse of the two signals: a COSMO metadata outage
  // counts as degraded-level, so it nudges a healthy processor to yellow but
  // never softens a processor that's already down.
  const display = worseStatus(
    processor.status,
    metadata.status === "down" ? "degraded" : "normal",
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-7 w-8 items-center justify-center rounded-sm border shadow-sm transition-colors lg:h-8 lg:w-9",
            textStatus(display),
            bgStatus(display),
          )}
          aria-label={m.aria_system_status()}
        >
          <IconActivity className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="flex flex-col gap-2 p-2">
        {/* processor */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{m.system_database()}</p>
            <IconServer
              className={cn("size-4", textStatus(processor.status))}
            />
          </div>
          <p className="text-xs">{formatFreshness(processor.lagSeconds)}</p>
        </div>

        {/* metadata */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{m.system_metadata()}</p>
            <IconWorld
              className={cn(
                "size-4",
                metadata.status === "down"
                  ? "text-yellow-500"
                  : "text-green-500",
              )}
            />
          </div>
          <p className="text-xs">{metadataText[metadata.status]}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ErrorFallback() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-cosmo-text">
            <IconActivity className="h-5 w-5" />
            <IconX className="h-4 w-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent>{m.system_status_fetch_error()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// the navbar dot collapses two orthogonal facts (sync lag + metadata health)
// into one indicator that scales to whichever is worse.
const statusSeverity = {
  normal: 0,
  degraded: 1,
  down: 2,
} satisfies Record<SystemStatusType, number>;

function worseStatus(a: SystemStatusType, b: SystemStatusType) {
  return statusSeverity[a] >= statusSeverity[b] ? a : b;
}

function textStatus(status: SystemStatusType) {
  return [
    status === "normal" && "text-green-500",
    status === "degraded" && "text-yellow-500",
    status === "down" && "text-red-600",
  ];
}

function bgStatus(status: SystemStatusType) {
  return [
    status === "normal" &&
      "bg-green-500/25 hover:bg-green-500/40 border-green-500/40",
    status === "degraded" &&
      "bg-yellow-500/25 hover:bg-yellow-500/40 border-yellow-500/40",
    status === "down" && "bg-red-600/25 hover:bg-red-600/40 border-red-600/40",
  ];
}

// renders the processor's last-block lag as plain freshness; anything under ~90s
// reads as caught up, otherwise the relative age with the unit picked to fit.
function formatFreshness(lagSeconds: number) {
  if (lagSeconds < 90) return m.system_status_synced();

  const formatter = new Intl.RelativeTimeFormat(getLocale(), {
    numeric: "auto",
  });
  const when =
    lagSeconds < 3600
      ? formatter.format(-Math.round(lagSeconds / 60), "minute")
      : lagSeconds < 86400
        ? formatter.format(-Math.round(lagSeconds / 3600), "hour")
        : formatter.format(-Math.round(lagSeconds / 86400), "day");
  return m.system_status_updated({ when });
}

const metadataText = {
  operational: m.system_status_metadata_operational(),
  down: m.system_status_metadata_down(),
} satisfies Record<MetadataStatus, string>;
