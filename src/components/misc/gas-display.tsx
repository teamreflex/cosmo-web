import { cn } from "@/lib/utils";
import { Fuel, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { fetchGasPrice } from "@/lib/server/alchemy/gas";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";

export default async function PolygonGasRenderer() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense
        fallback={
          <div className="w-12 h-6 rounded-lg bg-accent animate-pulse" />
        }
      >
        <GasDisplay />
      </Suspense>
    </ErrorBoundary>
  );
}

function ErrorFallback() {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="flex gap-1 items-center text-cosmo-text">
            <Fuel className="w-5 h-5" />
            <X className="w-4 h-4" />
          </div>
        </TooltipTrigger>
        <TooltipContent>Could not fetch gas price</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const text = {
  low: "Network is normal, transfers should be fast",
  medium: "Network has activity, transfers may be slow",
  high: "Network is congested, transfers will likely fail",
};

async function GasDisplay() {
  const { price, status } = await fetchGasPrice();

  if (price === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex gap-1 items-center cursor-default",
              status === "low" && "text-green-500",
              status === "medium" && "text-yellow-500",
              status === "high" && "text-red-600"
            )}
          >
            <Fuel className="w-5 h-5" />
            <span className="font-semibold">{price}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{text[status]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
