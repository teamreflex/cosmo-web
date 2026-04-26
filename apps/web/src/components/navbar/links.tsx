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
import { Button } from "../ui/button";
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

/**
 * Public desktop link buttons — rendered regardless of auth state.
 */
export function DesktopPublicLinks() {
  const location = useLocation();

  return (
    <div className="hidden items-center gap-1 lg:flex">
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
    </div>
  );
}

type AuthLinksProps = {
  cosmo?: PublicCosmo;
};

/**
 * Auth-gated desktop links — currently the user's Collection page.
 */
export function DesktopAuthLinks({ cosmo }: AuthLinksProps) {
  const location = useLocation();

  if (!cosmo) return null;

  return (
    <div className="hidden items-center gap-1 lg:flex">
      <LinkButton
        href={`/@${cosmo.username}`}
        active={location.pathname.startsWith(`/@${cosmo.username}`)}
        name={m.collection_title()}
      />
    </div>
  );
}

type MobileMenuProps = AuthLinksProps & { signedIn: boolean };

/**
 * Mobile hamburger menu with page links + artist selector for guests.
 */
export function MobileMenu(props: MobileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={m.common_menu()}
          className="lg:hidden"
        >
          <IconMenu2 className="size-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit" align="end">
        <DropdownMenuLabel>{m.common_menu()}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <MobileMenuItems {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenuItems(props: MobileMenuProps) {
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
