"use client";

import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { IconCards, type TablerIcon } from "@tabler/icons-react";
import NavbarSearch from "./navbar-search";
import { ArtistItem } from "./artist-selectbox";
import { useArtists } from "@/hooks/use-artists";
import type { PublicUser } from "@/lib/universal/auth";
import {
  ChartColumnBig,
  type LucideIcon,
  PackageOpen,
  Vote,
} from "lucide-react";
// import { use } from "react";
// import { LinkCosmoContext } from "../auth/link-cosmo";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";

type Props = {
  signedIn: boolean;
  cosmo?: PublicCosmo;
};

export function DesktopLinks({ signedIn, cosmo }: Props) {
  // const ctx = use(LinkCosmoContext);
  const path = usePathname();

  return (
    <div className="contents">
      <LinkButton
        href="/"
        active={path === "/" || path === "/objekts"}
        icon={IconCards}
        name="Objekts"
      />

      <LinkButton
        href="/objekts/stats"
        active={path === "/objekts/stats"}
        icon={ChartColumnBig}
        name="Objekt Stats"
      />

      <LinkButton
        href="/gravity"
        active={path.startsWith("/gravity")}
        icon={Vote}
        name="Gravity"
      />

      {cosmo && (
        <LinkButton
          href={`/@${cosmo.username}`}
          active={path.startsWith(`/@${cosmo.username}`)}
          icon={PackageOpen}
          name="Collection"
        />
      )}

      <NavbarSearch />
    </div>
  );
}

export function MobileLinks({ signedIn, cosmo }: Props) {
  // const ctx = use(LinkCosmoContext);
  const path = usePathname();
  const { artists, selectedIds } = useArtists();

  return (
    <div className="contents">
      {/* objekt index */}
      <DropdownMenuItem asChild>
        <Link href="/" aria-label="Objekts" prefetch={false}>
          <IconCards
            className={cn(
              "h-4 w-4 shrink-0 transition-all fill-transparent",
              (path === "/" || path === "/objekts") && "fill-white/50"
            )}
          />
          <span>Objekts</span>
        </Link>
      </DropdownMenuItem>

      {/* objekt stats */}
      <DropdownMenuItem asChild>
        <Link href="/objekts/stats" aria-label="Objekt Stats" prefetch={false}>
          <ChartColumnBig
            className={cn(
              "h-4 w-4 shrink-0 transition-all fill-transparent",
              path === "/objekts/stats" && "fill-white/50"
            )}
          />
          <span>Objekt Stats</span>
        </Link>
      </DropdownMenuItem>

      {/* gravity */}
      <DropdownMenuItem asChild>
        <Link href="/gravity" aria-label="Gravity" prefetch={false}>
          <Vote
            className={cn(
              "h-4 w-4 shrink-0 transition-all fill-transparent",
              path.startsWith("/gravity") && "fill-white/50"
            )}
          />
          <span>Gravity</span>
        </Link>
      </DropdownMenuItem>

      {cosmo && (
        // user has a cosmo cosmo, go to collection
        <DropdownMenuItem asChild>
          <Link
            href={`/@${cosmo.username}`}
            aria-label="Collection"
            prefetch={false}
          >
            <PackageOpen
              className={cn(
                "h-4 w-4 shrink-0 transition-all fill-transparent",
                path === `/@${cosmo.username}` && "fill-white/50"
              )}
            />
            <span>Collection</span>
          </Link>
        </DropdownMenuItem>
      )}

      {signedIn === false && (
        <div className="contents">
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {artists
              .sort((a, b) => a.comoTokenId - b.comoTokenId)
              .map((artist) => (
                <ArtistItem
                  key={artist.id}
                  artist={artist}
                  isSelected={selectedIds.includes(artist.id)}
                />
              ))}
          </DropdownMenuGroup>
        </div>
      )}
    </div>
  );
}

type LinkButtonProps = {
  href: string;
  active: boolean;
  user?: PublicUser;
  icon: LucideIcon | TablerIcon;
  name: string;
};

function LinkButton(props: LinkButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Link
            href={props.href}
            className="outline-hidden focus:outline-hidden"
            aria-label={props.name}
            prefetch={false}
          >
            <props.icon
              className={cn(
                "h-8 w-8 shrink-0 transition-all fill-transparent",
                props.active && "fill-cosmo/50 dark:fill-foreground/50"
              )}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent className="hidden sm:block">
          <p>{props.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
