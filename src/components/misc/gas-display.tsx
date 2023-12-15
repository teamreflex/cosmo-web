import { cn } from "@/lib/utils";
import { Fuel } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { getCachedGasPrice } from "@/lib/server/cache/gas-price";

const text = {
  low: "Network is normal, transfers should be fast",
  medium: "Network has activity, transfers may be slow",
  high: "Network is congested, transfers will likely fail",
};

export default async function GasDisplay() {
  const { price, status } = await getCachedGasPrice();

  if (price === 0) return null;

  return (
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
  );
}