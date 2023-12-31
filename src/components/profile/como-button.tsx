import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "lucide-react";
import Link from "next/link";

export default function ComoButton({ nickname }: { nickname: string }) {
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
            <Link href={`/@${nickname}/como`}>
              <Calendar className="h-5 w-5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">View COMO Drops</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
