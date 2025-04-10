import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "../ui/tooltip";

type Props = {
  message?: string;
};

export default function AuthFallback({ message }: Props) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative flex justify-center items-center py-1 px-2 rounded-xl bg-red-500/25 hover:bg-red-500/40 transition-colors">
            <AlertTriangle className="text-red-500 w-6 h-6" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          {message ?? "Error loading user from COSMO"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
