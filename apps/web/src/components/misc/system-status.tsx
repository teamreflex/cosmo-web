import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { systemStatusQuery } from "@/lib/queries/system";
import type { SystemStatus as SystemStatusType } from "@/lib/universal/system";
import { cn } from "@/lib/utils";
import { IconActivity, IconServer, IconX } from "@tabler/icons-react";
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
          <div className="h-8 w-9 animate-pulse rounded-l-md bg-secondary" />
        }
      >
        <SystemStatusPopover />
      </Suspense>
    </ErrorBoundary>
  );
}

function SystemStatusPopover() {
  const {
    data: { processor },
  } = useSuspenseQuery(systemStatusQuery);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex h-8 w-9 items-center justify-center rounded-l-lg transition-colors border shadow-sm",
            textStatus(processor.status),
            bgStatus(processor.status),
          )}
        >
          <IconActivity className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2">
        {/* processor */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{m.system_database()}</p>
            <div
              className={cn(
                "flex items-center gap-1",
                textStatus(processor.status),
              )}
            >
              <span className="font-semibold">
                {processor.height.processor}
              </span>
              <IconServer className="size-4" />
            </div>
          </div>
          <p className="text-xs">{processorText[processor.status]}</p>
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

// const gasText = {
//   normal: "Network is normal, transfers should be fast",
//   degraded: "Network has activity, transfers may be slow",
//   down: "Network is congested, transfers will likely fail",
// };

const processorText = {
  normal: m.system_status_normal(),
  degraded: m.system_status_degraded(),
  down: m.system_status_down(),
};
