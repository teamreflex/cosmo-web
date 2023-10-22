import Link from "next/link";
import { Home, LayoutGrid, PackageOpen, Search, Vote } from "lucide-react";
import AuthOptions from "./auth-options";
import CosmoLogo from "./cosmo-logo";
import { ReactNode } from "react";
import { TokenPayload } from "@/lib/server/jwt";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { CosmoArtist, ValidArtist } from "@/lib/server/cosmo";
import { UserSearch } from "./user-search";

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
    <div className="flex h-14 w-full items-center bg-background/75 transition-colors duration-500 sticky top-0 z-50 border-b border-accent backdrop-blur">
      <div className="container grid grid-cols-3 items-center gap-2 text-sm text-foreground md:gap-4 md:py-6 lg:grid-cols-3">
        <CosmoLogo color="white" />

        <div className="flex flex-row items-center gap-6 md:gap-10 justify-center">
          {links.map((link, i) => (
            <Tooltip key={i} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={{ pathname: link.href }}
                  className="drop-shadow-lg hover:scale-110 transition-all"
                  aria-label={link.name}
                >
                  <link.icon className="h-8 w-8 shrink-0" />
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>{link.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}

          <UserSearch />
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
  );
}
