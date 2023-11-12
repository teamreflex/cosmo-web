"use client";

import { Home, LayoutGrid, PackageOpen, Vote } from "lucide-react";
import Link from "next/link";
import NavbarSearch from "./navbar-search";
import { useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { name: "Home", icon: Home, href: "/", segment: null },
  { name: "Gravity", icon: Vote, href: "/gravity", segment: "gravity" },
  {
    name: "Collection",
    icon: PackageOpen,
    href: "/collection",
    segment: "collection",
  },
  { name: "Grid", icon: LayoutGrid, href: "/grid", segment: "grid" },
];

export default function Links() {
  const segment = useSelectedLayoutSegment();

  return (
    <div className="flex flex-row items-center gap-6 md:gap-10 justify-center">
      {links.map((link, i) => (
        <Link
          key={i}
          href={{ pathname: link.href }}
          className="drop-shadow-lg hover:scale-110 transition-all"
          aria-label={link.name}
        >
          <link.icon
            className={cn(
              "h-8 w-8 shrink-0 transition-all fill-transparent",
              link.segment === segment && "fill-white/50"
            )}
          />
        </Link>
      ))}

      <NavbarSearch />
    </div>
  );
}
