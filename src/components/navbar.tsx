"use client";

import Link from "next/link";
import { Home, PackageOpen, User } from "lucide-react";
import UserDropdown from "./user-dropdown";
import CosmoLogo from "./cosmo-logo";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { TokenPayload } from "@/lib/server/jwt";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { CosmoArtist, CosmoUser } from "@/lib/server/cosmo";

const links = [
  { name: "Home", icon: Home, href: "/" },
  { name: "Collection", icon: PackageOpen, href: "/collection" },
  { name: "Account", icon: User, href: "/my" },
];

type Props = {
  user: TokenPayload | undefined;
  cosmoUser: CosmoUser | undefined;
  artists: CosmoArtist[];
};

export default function Navbar({ user, artists, cosmoUser }: Props) {
  const ramperUser = useAuthStore((state) => state.ramperUser);

  const [hasScrolled, setHasScrolled] = useState(false);

  // add glass effect to nav when scrolled
  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 0) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    }

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "flex h-14 w-full items-center bg-background/100 transition-colors duration-500 sticky top-0 z-50 border-b border-accent backdrop-blur",
        hasScrolled && "bg-background/75"
      )}
    >
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
          <UserDropdown user={user} artists={artists} cosmoUser={cosmoUser} />
        </div>
      </div>
    </div>
  );
}
