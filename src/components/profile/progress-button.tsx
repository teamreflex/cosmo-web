import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PieChart } from "lucide-react";
import Link from "next/link";

export default function ProgressButton({ nickname }: { nickname: string }) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            className="rounded-full"
            variant="secondary"
            size="icon"
            asChild
          >
            <Link href={`/@${nickname}/progress`}>
              <PieChart className="h-5 w-5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">View Collection Progress</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
