import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { DesktopLinks, MobileLinks } from "./links.client";
import { Menu } from "lucide-react";
import NavbarSearch from "./navbar-search";

export default async function Links() {
  return (
    <div className="flex grow justify-end lg:justify-center">
      {/* desktop */}
      <div className="lg:flex flex-row items-center gap-6 hidden">
        <DesktopLinks />
      </div>

      {/* mobile */}
      <div className="lg:hidden flex flex-row gap-2 items-center">
        <NavbarSearch />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="drop-shadow-lg outline-hidden" aria-label="Menu">
              <Menu className="h-8 w-8 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <MobileLinks />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
