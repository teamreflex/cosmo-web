import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { DesktopLinks, MobileLinks } from "./links.client";
import { Menu, Search } from "lucide-react";
import NavbarSearch from "./navbar-search";
import {
  getArtistsWithMembers,
  getSelectedArtists,
  getSession,
} from "@/app/data-fetching";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { SelectedArtistsProvider } from "@/hooks/use-selected-artists";
import { toPublicUser } from "@/lib/server/auth";
import { IconCards } from "@tabler/icons-react";

export default async function Links() {
  const [artists, selectedArtists, session] = await Promise.all([
    getArtistsWithMembers(),
    getSelectedArtists(),
    getSession(),
  ]);

  const user = toPublicUser(session?.user);

  return (
    <CosmoArtistProvider artists={artists}>
      <SelectedArtistsProvider selected={selectedArtists}>
        <div className="flex grow justify-end lg:justify-center">
          {/* desktop */}
          <div className="lg:flex flex-row items-center gap-6 hidden">
            <DesktopLinks user={user} />
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
                <MobileLinks user={user} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </SelectedArtistsProvider>
    </CosmoArtistProvider>
  );
}

export function LinksSkeleton() {
  return (
    <div className="flex justify-center items-center gap-6">
      <IconCards className="hidden lg:block size-8 shrink-0 fill-transparent" />
      <Search className="hidden lg:block size-8 shrink-0 fill-transparent" />

      <Menu className="lg:hidden size-8 shrink-0 drop-shadow-lg" />
    </div>
  );
}
