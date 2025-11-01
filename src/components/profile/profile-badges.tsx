import {
  IconBrandDiscordFilled,
  IconBrandTwitterFilled,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { m } from "@/i18n/messages";

/**
 * User has verified their COSMO account
 */
export function CosmoVerifiedBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <img
            className="size-5 shrink-0 rounded invert dark:invert-0"
            src="/cosmo.webp"
            alt={m.common_cosmo()}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <div className="flex flex-row items-center gap-2">
            <Check className="h-4 w-4" />
            <span>{m.profile_badge_cosmo_verified()}</span>
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
          <img
            className="size-5 invert dark:invert-0"
            src="/modhaus.png"
            alt={m.profile_badge_modhaus_alt()}
          />
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <span>{m.profile_badge_modhaus()}</span>
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
          <button className="flex size-5 items-center justify-center rounded bg-discord text-white">
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
            to={href}
            className="flex size-5 items-center justify-center rounded bg-twitter text-white"
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
