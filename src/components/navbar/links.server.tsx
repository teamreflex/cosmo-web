import NavbarSearch from "./navbar-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { decodeUser } from "@/app/data-fetching";
import { DesktopLinks, MobileLinks } from "./links.client";
import { LuMenu } from "react-icons/lu";

export default async function Links() {
  const user = await decodeUser();

  return (
    <div className="flex grow justify-end lg:justify-center">
      {/* desktop */}
      <div className="lg:flex flex-row items-center gap-8 hidden">
        <DesktopLinks user={user} />
      </div>

      {/* mobile */}
      <div className="lg:hidden flex flex-row gap-2 items-center">
        <NavbarSearch authenticated={user !== undefined} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="drop-shadow-lg outline-hidden" aria-label="Menu">
              <LuMenu className="h-8 w-8 shrink-0" />
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
  );
}
