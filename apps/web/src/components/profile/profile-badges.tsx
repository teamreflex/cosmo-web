import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { m } from "@/i18n/messages";
import {
  IconBrandDiscordFilled,
  IconBrandTwitterFilled,
  IconCheck,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

/**
 * User has verified their COSMO account
 */
export function CosmoVerifiedBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="inline-flex h-5 items-center gap-1 rounded border border-border bg-background/40 px-1.5 font-mono text-xxs font-semibold tracking-[0.14em] text-muted-foreground uppercase"
            aria-label={m.profile_badge_cosmo_verified()}
          >
            <IconCheck className="size-3" />
            {m.profile_badge_verified()}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <span>{m.profile_badge_cosmo_verified()}</span>
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
          <button
            className="flex size-5 items-center justify-center rounded bg-discord text-white"
            aria-label={m.aria_discord_profile()}
          >
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
