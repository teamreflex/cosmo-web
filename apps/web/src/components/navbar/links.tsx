import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
import type { PublicUser } from "@/lib/universal/auth";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { cn } from "@/lib/utils";
import {
  IconArchive,
  IconCards,
  IconChartBar,
  IconFolderOpen,
  IconMenu2,
  IconPackage,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import { Link, useLocation } from "@tanstack/react-router";
import LinkCosmo from "../auth/link-cosmo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { ArtistItem } from "./artist-selectbox";
import NavbarSearch from "./navbar-search";

type Props = {
  signedIn: boolean;
  cosmo?: PublicCosmo;
};

export default function Links(props: Props) {
  return (
    <div className="flex grow justify-end lg:justify-center">
      <LinkCosmo>
        {/* desktop */}
        <div className="hidden flex-row items-center gap-6 lg:flex">
          <DesktopLinks {...props} />
        </div>

        {/* mobile */}
        <div className="flex flex-row items-center gap-2 lg:hidden">
          <NavbarSearch />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="outline-hidden drop-shadow-lg"
                aria-label={m.common_menu()}
              >
                <IconMenu2 className="h-8 w-8 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-fit" align="end">
              <DropdownMenuLabel>{m.common_menu()}</DropdownMenuLabel>
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
        name={m.objekts_header()}
      />

      <LinkButton
        href="/objekts/stats"
        active={location.pathname === "/objekts/stats"}
        icon={IconChartBar}
        name={m.nav_objekt_stats()}
      />

      <LinkButton
        href="/events"
        active={location.pathname === "/events"}
        icon={IconFolderOpen}
        name={m.events_header()}
      />

      <LinkButton
        href="/gravity"
        active={location.pathname.startsWith("/gravity")}
        icon={IconArchive}
        name={m.gravity_header()}
      />

      {props.cosmo && (
        <LinkButton
          href={`/@${props.cosmo.username}`}
          active={location.pathname.startsWith(`/@${props.cosmo.username}`)}
          icon={IconPackage}
          name={m.collection_title()}
        />
      )}

      <NavbarSearch />
    </div>
  );
}

export function MobileLinks(props: Props) {
  const location = useLocation();
  const { artistList, selectedIds } = useArtists();

  return (
    <div className="contents">
      {/* objekt index */}
      <DropdownMenuItem asChild>
        <Link to="/" aria-label={m.objekts_header()}>
          <IconCards
            className={cn(
              "h-4 w-4 shrink-0 fill-transparent transition-all",
              (location.pathname === "/" || location.pathname === "/objekts") &&
                "fill-white/50",
            )}
          />
          <span>{m.objekts_header()}</span>
        </Link>
      </DropdownMenuItem>

      {/* objekt stats */}
      <DropdownMenuItem asChild>
        <Link to="/objekts/stats" aria-label={m.nav_objekt_stats()}>
          <IconChartBar
            className={cn(
              "h-4 w-4 shrink-0 fill-transparent transition-all",
              location.pathname === "/objekts/stats" && "fill-white/50",
            )}
          />
          <span>{m.nav_objekt_stats()}</span>
        </Link>
      </DropdownMenuItem>

      <DropdownMenuItem asChild>
        <Link to="/events" aria-label={m.events_header()}>
          <IconFolderOpen
            className={cn(
              "h-4 w-4 shrink-0 fill-transparent transition-all",
              location.pathname === "/events" && "fill-white/50",
            )}
          />
          <span>{m.events_header()}</span>
        </Link>
      </DropdownMenuItem>

      {/* gravity */}
      <DropdownMenuItem asChild>
        <Link to="/gravity" aria-label={m.gravity_header()}>
          <IconArchive
            className={cn(
              "h-4 w-4 shrink-0 fill-transparent transition-all",
              location.pathname.startsWith("/gravity") && "fill-white/50",
            )}
          />
          <span>{m.gravity_header()}</span>
        </Link>
      </DropdownMenuItem>

      {props.cosmo && (
        // user has a cosmo cosmo, go to collection
        <DropdownMenuItem asChild>
          <Link
            to="/@{$username}"
            params={{ username: props.cosmo.username }}
            aria-label={m.collection_title()}
          >
            <IconPackage
              className={cn(
                "h-4 w-4 shrink-0 fill-transparent transition-all",
                location.pathname === `/@${props.cosmo.username}` &&
                  "fill-white/50",
              )}
            />
            <span>{m.collection_title()}</span>
          </Link>
        </DropdownMenuItem>
      )}

      {props.signedIn === false && (
        <div className="contents">
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {artistList
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
  icon: Icon;
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
                "h-8 w-8 shrink-0 fill-transparent transition-all",
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
