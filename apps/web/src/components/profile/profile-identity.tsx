import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { cn } from "@/lib/utils";
import {
  IconBrandDiscordFilled,
  IconBrandX,
  IconCheck,
  IconChevronDown,
  IconExternalLink,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { capsule } from "./capsule";

type Props = {
  modhaus: boolean;
  verified: boolean;
  // social handles the user chose to show
  discord: string | undefined;
  twitter: string | undefined;
};

const row = "flex min-h-12 items-center gap-3 rounded-sm px-2 md:min-h-10";

/**
 * Every mark on a profile, as glyphs in one capsule. A click or tap opens a
 * popover that spells each out, so touch gets what a pointer gets. Nothing
 * renders when the profile has no marks.
 */
export default function ProfileIdentity({
  modhaus,
  verified,
  discord,
  twitter,
}: Props) {
  const [_, copy] = useCopyToClipboard();

  if (!modhaus && !verified && discord === undefined && twitter === undefined)
    return null;

  return (
    <Popover>
      <PopoverTrigger
        className={cn(capsule, "gap-1.5")}
        aria-label={new Intl.ListFormat(getLocale(), { type: "unit" }).format(
          [
            modhaus && m.profile_badge_modhaus(),
            verified && m.profile_badge_cosmo_verified(),
            discord !== undefined && `${m.aria_discord()} ${discord}`,
            twitter !== undefined && `${m.aria_twitter()} @${twitter}`,
          ].filter((mark) => mark !== false),
        )}
      >
        {modhaus && (
          <img
            aria-hidden
            className="size-4 opacity-70 invert dark:invert-0"
            src="/modhaus.png"
            alt=""
          />
        )}
        {verified && <IconCheck aria-hidden className="size-4" />}
        {discord !== undefined && (
          <IconBrandDiscordFilled aria-hidden className="size-4" />
        )}
        {twitter !== undefined && <IconBrandX aria-hidden className="size-4" />}
        <IconChevronDown
          aria-hidden
          className="size-3 transition-transform group-data-popup-open:rotate-180"
        />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-0 p-1">
        {modhaus && (
          <div className={row}>
            <img
              aria-hidden
              className="size-4 shrink-0 invert dark:invert-0"
              src="/modhaus.png"
              alt=""
            />
            <span className="font-medium">{m.profile_badge_modhaus()}</span>
          </div>
        )}
        {verified && (
          <div className={cn(row, "py-2")}>
            <IconCheck aria-hidden className="size-4 shrink-0" />
            <span className="flex flex-col">
              <span className="font-medium">
                {m.profile_badge_cosmo_verified()}
              </span>
              <span className="text-xs text-muted-foreground">
                {m.profile_badge_cosmo_verified_description()}
              </span>
            </span>
          </div>
        )}
        {discord !== undefined && (
          <div className={cn(row, "pe-1")}>
            <IconBrandDiscordFilled
              role="img"
              aria-label={m.aria_discord()}
              className="size-4 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate font-medium">
              {discord}
            </span>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground max-md:h-10 max-md:px-3"
              aria-label={m.profile_copy_discord()}
              onClick={() => {
                void copy(discord);
                toast.success(m.toast_discord_handle_copied());
              }}
            >
              {m.common_copy()}
            </Button>
          </div>
        )}
        {twitter !== undefined && (
          <a
            href={`https://x.com/${twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              row,
              "transition-colors outline-none hover:bg-accent focus-visible:bg-accent",
            )}
          >
            <IconBrandX
              role="img"
              aria-label={m.aria_twitter()}
              className="size-4 shrink-0"
            />
            <span className="min-w-0 flex-1 truncate font-medium">
              @{twitter}
            </span>
            <IconExternalLink
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
            />
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}
