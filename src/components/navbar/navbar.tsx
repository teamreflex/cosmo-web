import Link from "next/link";
import { Home, LayoutGrid, PackageOpen, Vote } from "lucide-react";
import AuthOptions from "./auth/auth-options";
import CosmoLogo from "./cosmo-logo";
import { ReactNode } from "react";
import { TokenPayload } from "@/lib/server/jwt";
import { CosmoArtist, ValidArtist } from "@/lib/server/cosmo";
import NavbarSearch from "./navbar-search";

const links = [
  { name: "Home", icon: Home, href: "/" },
  { name: "Gravity", icon: Vote, href: "/gravity" },
  { name: "Collection", icon: PackageOpen, href: "/collection" },
  { name: "Grid", icon: LayoutGrid, href: "/grid" },
];

type Props = {
  user: TokenPayload | undefined;
  artists: CosmoArtist[];
  selectedArtist: ValidArtist | undefined;
  comoBalances: ReactNode;
};

export default function Navbar({
  user,
  artists,
  selectedArtist,
  comoBalances,
}: Props) {
  return (
    <nav className="sticky left-0 right-0 top-0 h-14 z-10">
      <div className="glass">
        <div className="flex w-full items-center h-14">
          <div className="container grid grid-cols-3 items-center gap-2 text-sm text-foreground md:gap-4 md:py-6 lg:grid-cols-3 pointer-events-auto">
            <CosmoLogo color="white" />

            <div className="flex flex-row items-center gap-6 md:gap-10 justify-center">
              {links.map((link, i) => (
                <Link
                  key={i}
                  href={{ pathname: link.href }}
                  className="drop-shadow-lg hover:scale-110 transition-all"
                  aria-label={link.name}
                >
                  <link.icon className="h-8 w-8 shrink-0" />
                </Link>
              ))}

              <NavbarSearch />
            </div>

            <div className="flex items-center justify-end gap-2">
              <AuthOptions
                user={user}
                artists={artists}
                selectedArtist={selectedArtist}
                comoBalances={comoBalances}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="glass-edge"></div>
    </nav>
  );
}
