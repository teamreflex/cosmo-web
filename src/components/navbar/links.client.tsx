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
import { LucideIcon, PackageOpen } from "lucide-react";
import { LinkCosmoContext } from "../auth/link-cosmo";
import { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { use } from "react";

type Props = {
  cosmo?: PublicCosmo;
};

export function DesktopLinks({ cosmo }: Props) {
  const ctx = use(LinkCosmoContext);
  const path = usePathname();

  return (
    <div className="contents">
      <LinkButton
        href="/objekts"
        active={path === "/objekts"}
        icon={IconCards}
        name="Objekts"
      />

      {cosmo ? (
        <LinkButton
          href={`/@${cosmo.username}`}
          active={path.startsWith(`/@${cosmo.username}`)}
          icon={PackageOpen}
          name="Collection"
        />
      ) : (
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
      )}

      <NavbarSearch />
    </div>
  );
}

export function MobileLinks({ cosmo }: Props) {
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
      ) : (
        // user needs to link a cosmo cosmo
        <DropdownMenuItem onClick={() => ctx.setOpen(true)}>
          <PackageOpen className="h-4 w-4 shrink-0 transition-all fill-transparent" />
          <span>Link COSMO</span>
        </DropdownMenuItem>
      )}

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
