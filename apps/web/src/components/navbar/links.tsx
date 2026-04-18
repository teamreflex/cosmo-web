import { useArtists } from "@/hooks/use-artists";
import { m } from "@/i18n/messages";
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
import { Link, useLocation } from "@tanstack/react-router";
import NotificationBell from "../notifications/notification-bell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ArtistItem } from "./artist-selectbox";
import NavbarSearch from "./navbar-search";

type Props = {
  signedIn: boolean;
  cosmo?: PublicCosmo;
};

export default function Links(props: Props) {
  const location = useLocation();

  return (
    <>
      {/* desktop */}
      <div className="hidden grow items-center gap-1 lg:flex">
        <DesktopLinks {...props} />
      </div>

      {/* mobile */}
      <div className="ml-auto flex flex-row items-center gap-2 lg:hidden">
        <NotificationBell key={location.pathname} />

        <NavbarSearch />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="inline-flex size-8 items-center justify-center rounded-sm border border-border text-muted-foreground outline-hidden hover:bg-accent hover:text-foreground"
              aria-label={m.common_menu()}
            >
              <IconMenu2 className="size-4 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-fit" align="end">
            <DropdownMenuLabel>{m.common_menu()}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <MobileLinks {...props} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

function DesktopLinks(props: Props) {
  const location = useLocation();

  return (
    <>
      <LinkButton
        href="/"
        active={location.pathname === "/" || location.pathname === "/objekts"}
        name={m.objekts_header()}
      />

      <LinkButton
        href="/objekts/stats"
        active={location.pathname === "/objekts/stats"}
        name={m.nav_objekt_stats()}
      />

      <LinkButton
        href="/events"
        active={location.pathname.startsWith("/events")}
        name={m.events_header()}
      />

      <LinkButton
        href="/gravity"
        active={location.pathname.startsWith("/gravity")}
        name={m.gravity_header()}
      />

      {props.cosmo && (
        <LinkButton
          href={`/@${props.cosmo.username}`}
          active={location.pathname.startsWith(`/@${props.cosmo.username}`)}
          name={m.collection_title()}
        />
      )}

      <NavbarSearch />
    </>
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
  name: string;
};

function LinkButton(props: LinkButtonProps) {
  return (
    <Link
      to={props.href}
      aria-label={props.name}
      data-active={props.active || undefined}
      className="relative flex h-14 items-center px-3 text-sm font-medium text-muted-foreground outline-hidden transition-colors hover:text-foreground data-[active]:text-foreground"
    >
      {props.name}
      {props.active && (
        <span className="absolute inset-x-3 bottom-0 h-0.5 bg-cosmo" />
      )}
    </Link>
  );
}
