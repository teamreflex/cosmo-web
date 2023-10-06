import Link from "next/link";
import { Home, LayoutGrid, PackageOpen, User } from "lucide-react";
import AuthOptions from "./auth-options";
import CosmoLogo from "./cosmo-logo";
import { ReactNode } from "react";
import { TokenPayload } from "@/lib/server/jwt";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { CosmoArtist, ValidArtist } from "@/lib/server/cosmo";

const links = [
  { name: "Home", icon: Home, href: "/" },
  { name: "Collection", icon: PackageOpen, href: "/collection" },
  { name: "Grid", icon: LayoutGrid, href: "/grid" },
  { name: "Account", icon: User, href: "/my" },
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

        <div className="flex flex-row items-center gap-10 justify-center">
          {links.map((link, i) => (
            <Tooltip key={i} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={{ pathname: link.href }}
                  className="border-foreground pb-1 drop-shadow-lg hover:border-b-2"
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
