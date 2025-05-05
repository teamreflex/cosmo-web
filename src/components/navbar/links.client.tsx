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
import { NavbarLink } from "./links";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { IconCards } from "@tabler/icons-react";
import NavbarSearch from "./navbar-search";
import { ArtistItem } from "./artist-selectbox";
import { useCosmoArtists } from "@/hooks/use-cosmo-artist";
import { useSelectedArtists } from "@/hooks/use-selected-artists";

export function DesktopLinks() {
  const path = usePathname();

  return (
    <div className="contents">
      {links.map((link, i) => {
        const href = link.href;
        return (
          <LinkButton
            key={i}
            link={link}
            active={href === "/" ? path === "/" : path === href}
          />
        );
      })}

      <NavbarSearch />
    </div>
  );
}

export function MobileLinks() {
  const path = usePathname();
  const { artists } = useCosmoArtists();
  const { selectedIds } = useSelectedArtists();

  return (
    <div className="contents">
      {links.map((link) => {
        const href = link.href;
        const active = href === "/" ? path === "/" : path === href;

        return (
          <DropdownMenuItem key={href} asChild>
            <Link
              href={href}
              aria-label={link.name}
              prefetch={link.prefetch === true}
            >
              <link.icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-all fill-transparent",
                  active && "fill-white/50"
                )}
              />
              <span>{link.name}</span>
            </Link>
          </DropdownMenuItem>
        );
      })}

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
  link: NavbarLink;
  active: boolean;
};

function LinkButton({ link, active }: LinkButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Link
            href={link.href}
            className="outline-hidden focus:outline-hidden"
            aria-label={link.name}
            prefetch={link.prefetch === true}
          >
            <link.icon
              className={cn(
                "h-8 w-8 shrink-0 transition-all fill-transparent",
                active && "fill-cosmo/50 dark:fill-foreground/50"
              )}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent className="hidden sm:block">
          <p>{link.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const links: NavbarLink[] = [
  {
    name: "Objekts",
    icon: IconCards,
    href: "/objekts",
    prefetch: true,
  },
];
