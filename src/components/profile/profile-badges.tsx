import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CosmoLogo from "@/assets/cosmo.webp";
import ModhausLogo from "@/assets/modhaus.png";
import Image from "next/image";
import {
  IconBrandDiscordFilled,
  IconBrandTwitterFilled,
} from "@tabler/icons-react";
import Link from "next/link";
import { env } from "@/env";
import { Check } from "lucide-react";

/**
 * User has verified their COSMO account
 */
export function CosmoVerifiedBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Image
            className="rounded shrink-0 invert dark:invert-0"
            src={CosmoLogo.src}
            alt="COSMO"
            width={20}
            height={20}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <div className="flex flex-row gap-2 items-center">
            <Check className="w-4 h-4" />
            <span>Linked to an {env.NEXT_PUBLIC_APP_NAME} account</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * User is an official Modhaus account
 */
export function ModhausBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Image
            className="invert dark:invert-0"
            src={ModhausLogo.src}
            alt="Modhaus"
            width={20}
            height={20}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <span>Official Modhaus account</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * User has their Discord handle set.
 */
export function DiscordBadge(props: { handle: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="bg-discord text-white rounded size-5 flex items-center justify-center">
            <IconBrandDiscordFilled className="w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <span>{props.handle}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * User has their Twitter handle set.
 */
export function TwitterBadge(props: { handle: string }) {
  const href = `https://x.com/${props.handle}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className="bg-twitter text-white rounded size-5 flex items-center justify-center"
          >
            <IconBrandTwitterFilled className="w-4" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <span>@{props.handle}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
