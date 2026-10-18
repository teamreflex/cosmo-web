import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { systemStatusQuery } from "@/lib/queries/system";
import type { SystemStatus as SystemStatusType } from "@/lib/universal/system";
import { cn } from "@/lib/utils";
import { IconActivity, IconServer } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Timestamp } from "../ui/timestamp";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

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
    data: { processor },
  } = useSuspenseQuery(systemStatusQuery);

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "flex h-7 w-8 items-center justify-center rounded-sm border shadow-sm transition-colors lg:h-8 lg:w-9",
          textStatus(processor.status),
          bgStatus(processor.status),
        )}
        aria-label={m.aria_system_status()}
      >
        <IconActivity className="h-5 w-5" />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2">
        {/* processor */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <IconServer className="size-4" />
              <p className="text-sm font-semibold">{m.system_database()}</p>
            </div>
            <Timestamp
              date={new Date(processor.timestamp)}
              relative="long"
              className={cn("font-semibold", textStatus(processor.status))}
            />
          </div>
          <Timestamp
            date={new Date(processor.timestamp)}
            format="MMM d, yyyy h:mm:ss a"
            className="self-end text-xs text-muted-foreground"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ErrorFallback() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            className={cn(
              "flex h-7 w-8 items-center justify-center rounded-sm border shadow-sm transition-colors lg:h-8 lg:w-9",
              bgStatus("degraded"),
              textStatus("degraded"),
            )}
            aria-label={m.system_status_fetch_error()}
          />
        }
      >
        <IconActivity className="h-5 w-5" />
      </TooltipTrigger>
      <TooltipContent>{m.system_status_fetch_error()}</TooltipContent>
    </Tooltip>
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
