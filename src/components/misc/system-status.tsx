import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getSystemStatus } from "@/lib/server/system";
import { SystemStatus as SystemStatusType } from "@/lib/universal/system";
import { cn } from "@/lib/utils";
import { Activity, HardDriveDownload, X } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Suspense } from "react";

export default async function SystemStatus() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense
        fallback={
          <div className="h-8 w-9 rounded-l-lg bg-accent animate-pulse" />
        }
      >
        <SystemStatusPopover />
      </Suspense>
    </ErrorBoundary>
  );
}

async function SystemStatusPopover() {
  const { processor } = await getSystemStatus();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "h-8 w-9 flex justify-center items-center rounded-l-lg transition-colors",
            textStatus(processor.status),
            bgStatus(processor.status)
          )}
        >
          <Activity className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2">
        {/* processor */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Database</p>
            <div
              className={cn(
                "flex gap-1 items-center",
                textStatus(processor.status)
              )}
            >
              <span className="font-semibold">
                {processor.height.processor}
              </span>
              <HardDriveDownload className="size-4" />
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
          <div className="flex gap-1 items-center text-cosmo-text">
            <Activity className="w-5 h-5" />
            <X className="w-4 h-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent>Could not fetch system status</TooltipContent>
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
    status === "normal" && "bg-green-500/25 hover:bg-green-500/40",
    status === "degraded" && "bg-yellow-500/25 hover:bg-yellow-500/40",
    status === "down" && "bg-red-600/25 hover:bg-red-600/40",
  ];
}

// const gasText = {
//   normal: "Network is normal, transfers should be fast",
//   degraded: "Network has activity, transfers may be slow",
//   down: "Network is congested, transfers will likely fail",
// };

const processorText = {
  normal: "Database is up to date",
  degraded: "Database is ~1 hour behind",
  down: "Database is over 1 hour behind",
};
