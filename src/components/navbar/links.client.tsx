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
import { IconCards, TablerIcon } from "@tabler/icons-react";
import NavbarSearch from "./navbar-search";
import { ArtistItem } from "./artist-selectbox";
import { useArtists } from "@/hooks/use-artists";
import { PublicUser } from "@/lib/universal/auth";
import { LucideIcon, PackageOpen, Vote } from "lucide-react";
import { LinkCosmoContext } from "../auth/link-cosmo";
import { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { use } from "react";

type Props = {
  signedIn: boolean;
  cosmo?: PublicCosmo;
};

export function DesktopLinks({ signedIn, cosmo }: Props) {
  const ctx = use(LinkCosmoContext);
  const path = usePathname();

  return (
    <div className="contents">
      <LinkButton
        href="/objekts"
        active={path.startsWith("/objekts")}
        icon={IconCards}
        name="Objekts"
      />

      <LinkButton
        href="/gravity"
        active={path.startsWith("/gravity")}
        icon={Vote}
        name="Gravity"
      />

      {cosmo ? (
        <LinkButton
          href={`/@${cosmo.username}`}
          active={path.startsWith(`/@${cosmo.username}`)}
          icon={PackageOpen}
          name="Collection"
        />
      ) : signedIn ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => ctx.setOpen(true)}>
                <PackageOpen className="size-8 shrink-0 transition-all fill-transparent" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Link COSMO</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}

      <NavbarSearch />
    </div>
  );
}

export function MobileLinks({ signedIn, cosmo }: Props) {
  const ctx = use(LinkCosmoContext);
  const path = usePathname();
  const { artists, selectedIds } = useArtists();

  return (
    <div className="contents">
      {/* objekt index */}
      <DropdownMenuItem asChild>
        <Link href="/objekts" aria-label="Objekts">
          <IconCards
            className={cn(
              "h-4 w-4 shrink-0 transition-all fill-transparent",
              path === "/objekts" && "fill-white/50"
            )}
          />
          <span>Objekts</span>
        </Link>
      </DropdownMenuItem>

      {/* gravity */}
      <DropdownMenuItem asChild>
        <Link href="/gravity" aria-label="Gravity">
          <Vote
            className={cn(
              "h-4 w-4 shrink-0 transition-all fill-transparent",
              path === "/objekts" && "fill-white/50"
            )}
          />
          <span>Gravity</span>
        </Link>
      </DropdownMenuItem>

      {cosmo ? (
        // user has a cosmo cosmo, go to collection
        <DropdownMenuItem asChild>
          <Link href={`/@${cosmo.username}`} aria-label="Collection">
            <PackageOpen
              className={cn(
                "h-4 w-4 shrink-0 transition-all fill-transparent",
                path === `/@${cosmo.username}` && "fill-white/50"
              )}
            />
            <span>Collection</span>
          </Link>
        </DropdownMenuItem>
      ) : // user needs to link a cosmo account
      signedIn ? (
        <DropdownMenuItem onClick={() => ctx.setOpen(true)}>
          <PackageOpen className="h-4 w-4 shrink-0 transition-all fill-transparent" />
          <span>Link COSMO</span>
        </DropdownMenuItem>
      ) : null}

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
