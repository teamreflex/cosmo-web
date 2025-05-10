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
import { IconCards } from "@tabler/icons-react";
import { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import LinkCosmo from "../auth/link-cosmo";

type Props = {
  cosmo?: PublicCosmo;
};

export default async function Links({ cosmo }: Props) {
  return (
    <div className="flex grow justify-end lg:justify-center">
      <LinkCosmo>
        {/* desktop */}
        <div className="lg:flex flex-row items-center gap-6 hidden">
          <DesktopLinks cosmo={cosmo} />
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
              <MobileLinks cosmo={cosmo} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </LinkCosmo>
    </div>
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
