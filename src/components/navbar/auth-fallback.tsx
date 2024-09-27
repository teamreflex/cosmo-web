import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "../ui/tooltip";

export default function AuthFallback() {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex justify-center items-center py-1 px-2 rounded-xl bg-red-500 bg-opacity-25 hover:bg-opacity-40 transition-colors">
            <AlertTriangle className="text-red-500 w-6 h-6" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          Error loading user from COSMO
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
