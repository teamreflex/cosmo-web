import { ChartColumnBig, Menu, PackageOpen, Vote } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { IconCards } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import LinkCosmo from "../auth/link-cosmo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import NavbarSearch from "./navbar-search";
import { ArtistItem } from "./artist-selectbox";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import type { TablerIcon } from "@tabler/icons-react";
import type { PublicUser } from "@/lib/universal/auth";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useArtists } from "@/hooks/use-artists";

type Props = {
  signedIn: boolean;
  cosmo?: PublicCosmo;
};

export default function Links(props: Props) {
  return (
    <div className="flex grow justify-end lg:justify-center">
      <LinkCosmo>
        {/* desktop */}
        <div className="lg:flex flex-row items-center gap-6 hidden">
          <DesktopLinks {...props} />
        </div>

        {/* mobile */}
        <div className="lg:hidden flex flex-row gap-2 items-center">
          <NavbarSearch />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="drop-shadow-lg outline-hidden"
                aria-label="Menu"
              >
                <Menu className="h-8 w-8 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <MobileLinks {...props} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </LinkCosmo>
    </div>
  );
}

type LinksProps = {
  signedIn: boolean;
  cosmo?: PublicCosmo;
};

function DesktopLinks(props: LinksProps) {
  const location = useLocation();

  return (
    <div className="contents">
      <LinkButton
        href="/"
        active={location.pathname === "/" || location.pathname === "/objekts"}
        icon={IconCards}
        name="Objekts"
      />

      <LinkButton
        href="/objekts/stats"
        active={location.pathname === "/objekts/stats"}
        icon={ChartColumnBig}
        name="Objekt Stats"
      />

      <LinkButton
        href="/gravity"
        active={location.pathname.startsWith("/gravity")}
        icon={Vote}
        name="Gravity"
      />

      {props.cosmo && (
        <LinkButton
          href={`/@${props.cosmo.username}`}
          active={location.pathname.startsWith(`/@${props.cosmo.username}`)}
          icon={PackageOpen}
          name="Collection"
        />
      )}

      <NavbarSearch />
    </div>
  );
}

export function MobileLinks(props: Props) {
  const location = useLocation();
  const { artists, selectedIds } = useArtists();

  return (
    <div className="contents">
      {/* objekt index */}
      <DropdownMenuItem asChild>
        <Link to="/" aria-label="Objekts">
          <IconCards
            className={cn(
              "h-4 w-4 shrink-0 transition-all fill-transparent",
              (location.pathname === "/" || location.pathname === "/objekts") &&
                "fill-white/50",
            )}
          />
          <span>Objekts</span>
        </Link>
      </DropdownMenuItem>

      {/* objekt stats */}
      <DropdownMenuItem asChild>
        <Link to="/objekts/stats" aria-label="Objekt Stats">
          <ChartColumnBig
            className={cn(
              "h-4 w-4 shrink-0 transition-all fill-transparent",
              location.pathname === "/objekts/stats" && "fill-white/50",
            )}
          />
          <span>Objekt Stats</span>
        </Link>
      </DropdownMenuItem>

      {/* gravity */}
      <DropdownMenuItem asChild>
        <Link to="/gravity" aria-label="Gravity">
          <Vote
            className={cn(
              "h-4 w-4 shrink-0 transition-all fill-transparent",
              location.pathname.startsWith("/gravity") && "fill-white/50",
            )}
          />
          <span>Gravity</span>
        </Link>
      </DropdownMenuItem>

      {props.cosmo && (
        // user has a cosmo cosmo, go to collection
        <DropdownMenuItem asChild>
          <Link
            to="/@{$username}"
            params={{ username: props.cosmo.username }}
            aria-label="Collection"
          >
            <PackageOpen
              className={cn(
                "h-4 w-4 shrink-0 transition-all fill-transparent",
                location.pathname === `/@${props.cosmo.username}` &&
                  "fill-white/50",
              )}
            />
            <span>Collection</span>
          </Link>
        </DropdownMenuItem>
      )}

      {props.signedIn === false && (
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
            to={props.href}
            className="outline-hidden focus:outline-hidden"
            aria-label={props.name}
          >
            <props.icon
              className={cn(
                "h-8 w-8 shrink-0 transition-all fill-transparent",
                props.active && "fill-cosmo/50 dark:fill-foreground/50",
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
