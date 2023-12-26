"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { User } from "lucide-react";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

type Props = {
  url: string;
};

export default function BackButton({ url }: Props) {
  const pathname = usePathname();

  if (pathname === url) return null;

  return (
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
      <TooltipContent side="bottom">Return to profile</TooltipContent>
    </Tooltip>
  );
}