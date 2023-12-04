"use client";

import {
  Home,
  LayoutGrid,
  PackageOpen,
  Vote,
  LibraryBig,
  Menu,
  CalendarRange,
} from "lucide-react";
import Link from "next/link";
import NavbarSearch from "./navbar-search";
import { usePathname, useSelectedLayoutSegment } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const links = [
  { name: "Home", icon: Home, href: "/", segment: null, requireAuth: true },
  {
    name: "Gravity",
    icon: Vote,
    href: "/gravity",
    segment: "gravity",
    requireAuth: true,
  },
  {
    name: "Objekts",
    icon: LibraryBig,
    href: "/objekts",
    segment: "objekts",
    requireAuth: false,
  },
  {
    name: "Collection",
    icon: PackageOpen,
    href: "/collection",
    segment: "collection",
    requireAuth: true,
  },
  {
    name: "COMO",
    icon: CalendarRange,
    href: "/como",
    segment: "como",
    requireAuth: true,
  },
  {
    name: "Grid",
    icon: LayoutGrid,
    href: "/grid",
    segment: "grid",
    requireAuth: true,
  },
];

export default function Links({ authenticated }: { authenticated: boolean }) {
  const segment = useSelectedLayoutSegment();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <div className="flex grow justify-end sm:justify-center">
      {/* desktop */}
      <div className="sm:flex flex-row items-center gap-8 hidden">
        <LinkIcons segment={segment} authenticated={authenticated} />
      </div>

      {/* mobile */}
      <div className="sm:hidden flex flex-row items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="h-8 w-8 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            sideOffset={10}
            className="w-[calc(100vw-1rem)] mx-2 flex flex-row justify-between"
          >
            <LinkIcons segment={segment} authenticated={authenticated} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

function LinkIcons({
  segment,
  authenticated,
}: {
  segment: string | null;
  authenticated: boolean;
}) {
  return (
    <>
      {links.map((link, i) => (
        <Tooltip key={i} delayDuration={0}>
          <TooltipTrigger>
            <Link
              href={{ pathname: link.href }}
              className="drop-shadow-lg hover:scale-110 transition-all"
              aria-label={link.name}
            >
              <link.icon
                className={cn(
                  "h-8 w-8 shrink-0 transition-all fill-transparent",
                  link.segment === segment && "fill-white/50",
                  link.requireAuth &&
                    !authenticated &&
                    "text-slate-500 cursor-not-allowed"
                )}
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {authenticated || (!link.requireAuth && !authenticated)
                ? link.name
                : "Sign in first!"}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}

      <NavbarSearch />
    </>
  );
}
