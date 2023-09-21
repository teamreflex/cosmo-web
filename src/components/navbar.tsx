"use client";

import Link from "next/link";
import { Home, PackageOpen, User } from "lucide-react";
import AuthOptions from "./auth-options";
import CosmoLogo from "./cosmo-logo";
import { Separator } from "./ui/separator";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const links = [
  { name: "Home", icon: Home, href: "/" },
  { name: "Collection", icon: PackageOpen, href: "/collection" },
  { name: "Account", icon: User, href: "/my" },
];

export default function Navbar() {
  const [hasScrolled, setHasScrolled] = useState(false);

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
        "flex h-14 w-full items-center bg-background/100 transition-colors duration-500 fixed z-50 border-b border-accent backdrop-blur",
        hasScrolled && "bg-background/75"
      )}
    >
      <div className="container grid grid-cols-2 items-center gap-2 text-sm text-foreground md:gap-4 md:py-6 lg:grid-cols-3">
        <Link
          href={{ pathname: "/" }}
          className="hidden font-semibold underline underline-offset-4 lg:block w-fit"
          aria-label="Home"
        >
          <CosmoLogo color="white" />
        </Link>

        <div className="flex flex-row items-center justify-start gap-10 lg:justify-center">
          {links.map((link, i) => (
            <Link
              key={i}
              href={{ pathname: link.href }}
              className="border-foreground pb-1 drop-shadow-lg hover:border-b-2"
              aria-label={link.name}
            >
              <link.icon className="h-8 w-8 shrink-0" />
            </Link>
          ))}
        </div>

        <div className="flex justify-end">
          <Separator orientation="vertical" />
          <AuthOptions />
        </div>
      </div>
    </div>
  );
}
