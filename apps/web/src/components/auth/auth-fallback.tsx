import { m } from "@/i18n/messages";
import { IconAlertTriangle } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type Props = {
  message?: string;
};

export default function AuthFallback({ message }: Props) {
  return (
    <div className="col-span-2 flex grow-0 items-center justify-end gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative flex items-center justify-center rounded-xl bg-red-500/25 px-2 py-1 transition-colors hover:bg-red-500/40">
              <IconAlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            {message ?? m.error_loading_user()}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
