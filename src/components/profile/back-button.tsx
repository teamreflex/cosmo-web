"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { User } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type Props = {
  url: string;
  tooltip: string;
};

export default function BackButton({ url, tooltip }: Props) {
  const pathname = usePathname();

  if (pathname === url) return null;

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
            <Link href={url}>
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
