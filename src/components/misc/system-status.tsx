import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchGasPrice } from "@/lib/server/alchemy/gas";
import { fetchProcessorStatus } from "@/lib/server/system";
import { SystemStatus as SystemStatusType } from "@/lib/universal/system";
import { cn } from "@/lib/utils";
import { Activity, Fuel, HardDriveDownload, X } from "lucide-react";
import { Separator } from "../ui/separator";
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
          <div className="w-12 h-6 rounded-lg bg-accent animate-pulse" />
        }
      >
        <SystemStatusPopover />
      </Suspense>
    </ErrorBoundary>
  );
}

async function SystemStatusPopover() {
  const [gas, processor] = await Promise.all([
    fetchGasPrice(),
    fetchProcessorStatus(),
  ]);

  const statuses = [gas.status, processor.status];
  const status = statuses.includes("degraded")
    ? "degraded"
    : statuses.includes("down")
    ? "down"
    : "normal";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "py-1.5 px-2 rounded-xl bg-opacity-25 hover:bg-opacity-40 transition-colors",
            textStatus(status),
            bgStatus(status)
          )}
        >
          <Activity className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2">
        <h3 className="text-sm font-semibold">System Status</h3>

        <Separator orientation="horizontal" className="my-2" />

        {/* gas */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Polygon</p>
            <div
              className={cn("flex gap-1 items-center", textStatus(gas.status))}
            >
              <span className="font-semibold">{gas.price}</span>
              <Fuel className="size-4" />
            </div>
          </div>
          <p className="text-xs">{gasText[gas.status]}</p>
        </div>

        <Separator orientation="horizontal" className="my-2" />

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
      <Tooltip delayDuration={0}>
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
    status === "normal" && "bg-green-500",
    status === "degraded" && "bg-yellow-500",
    status === "down" && "bg-red-600",
  ];
}

const gasText = {
  normal: "Network is normal, transfers should be fast",
  degraded: "Network has activity, transfers may be slow",
  down: "Network is congested, transfers will likely fail",
};

const processorText = {
  normal: "Database is up to date",
  degraded: "Database is ~1 hour behind",
  down: "Database is over 1 hour behind",
};
