import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Send } from "lucide-react";
import Link from "next/link";

export default function TradesButton({ nickname }: { nickname: string }) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button
          className="rounded-full"
          variant="secondary"
          size="icon"
          asChild
        >
          <Link href={`/@${nickname}/trades`}>
            <Send className="h-5 w-5" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">View Trades</TooltipContent>
    </Tooltip>
  );
}
