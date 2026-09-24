import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground"
            aria-label={m.profile_badge_cosmo_verified()}
          />
        }
      >
        <IconCheck className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        <span>{m.profile_badge_cosmo_verified()}</span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * User is an official Modhaus account
 */
export function ModhausBadge() {
  return (
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
  );
}

/**
 * User has their Discord handle set.
 */
export function DiscordBadge(props: { handle: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="flex size-5 items-center justify-center rounded bg-discord text-white"
        aria-label={m.aria_discord_profile()}
      >
        <IconBrandDiscordFilled className="w-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        <span>{props.handle}</span>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * User has their Twitter handle set.
 */
export function TwitterBadge(props: { handle: string }) {
  const href = `https://x.com/${props.handle}`;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            to={href}
            className="flex size-5 items-center justify-center rounded bg-twitter text-white"
          />
        }
      >
        <IconBrandTwitterFilled className="w-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        <span>@{props.handle}</span>
      </TooltipContent>
    </Tooltip>
  );
}
