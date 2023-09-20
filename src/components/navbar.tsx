"use client";

import Link from "next/link";
import { Home, PackageOpen, User } from "lucide-react";
import { Button } from "./ui/button";
import AuthOptions from "./auth-options";

const links = [
  { name: "Home", icon: Home, href: "/home" },
  { name: "Collection", icon: PackageOpen, href: "/collection" },
  { name: "Account", icon: User, href: "/my" },
];

export default function Navbar() {
  return (
    <div className="flex h-16 items-center bg-foreground/20">
      <div className="container grid grid-cols-2 items-center gap-2 text-sm text-foreground dark:text-background md:gap-4 md:py-6 lg:grid-cols-3">
        <Link
          href={{ pathname: "/home" }}
          className="hidden font-semibold underline underline-offset-4 lg:block"
          aria-label="Home"
        >
          Cosmo
        </Link>

        <div className="flex flex-row items-center justify-start gap-10 lg:justify-center">
          {links.map((link, i) => (
            <Link
              key={i}
              href={{ pathname: link.href }}
              className="border-reflex-400 pb-1 drop-shadow-lg hover:border-b-2"
              aria-label={link.name}
            >
              <link.icon className="h-8 w-8 shrink-0" />
            </Link>
          ))}
        </div>

        <div className="flex justify-end">
          <AuthOptions />
        </div>
      </div>
    </div>
  );
}
