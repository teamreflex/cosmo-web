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
import { PublicUser } from "@/lib/universal/auth";
import { PackageOpen } from "lucide-react";

type Props = {
  user?: PublicUser;
};

export function DesktopLinks({ user }: Props) {
  const path = usePathname();

  return (
    <div className="contents">
      {links.map((link, i) => {
        if (link.requireAuth && !user) {
          return null;
        }

        const href = link.href(user);
        return (
          <LinkButton
            key={i}
            link={link}
            active={href === "/" ? path === "/" : path === href}
            user={user}
          />
        );
      })}

      <NavbarSearch />
    </div>
  );
}

export function MobileLinks({ user }: Props) {
  const path = usePathname();
  const { artists } = useCosmoArtists();
  const { selectedIds } = useSelectedArtists();

  return (
    <div className="contents">
      {links.map((link) => {
        if (link.requireAuth && !user) {
          return null;
        }

        const href = link.href(user);
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
  user?: PublicUser;
};

function LinkButton({ link, active, user }: LinkButtonProps) {
  const authenticated = user !== undefined;
  const pathname = link.href(user);
  const disabled = link.requireAuth && !authenticated;
  const prefetch = disabled === false && link.prefetch === true;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Link
            href={{ pathname }}
            className="outline-hidden focus:outline-hidden"
            aria-label={link.name}
            prefetch={prefetch}
          >
            <link.icon
              className={cn(
                "h-8 w-8 shrink-0 transition-all fill-transparent",
                active && "fill-cosmo/50 dark:fill-foreground/50",
                disabled && "text-slate-500 cursor-not-allowed"
              )}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent className="hidden sm:block">
          <p>
            {authenticated || (!link.requireAuth && !authenticated)
              ? link.name
              : "Sign in first!"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const links: NavbarLink[] = [
  {
    name: "Objekts",
    icon: IconCards,
    href: () => "/objekts",
    prefetch: true,
    requireAuth: false,
  },
  {
    name: "Collection",
    icon: PackageOpen,
    href: (user) => (user ? `/@${user.username}` : "/objekts"),
    prefetch: true,
    requireAuth: true,
  },
];
