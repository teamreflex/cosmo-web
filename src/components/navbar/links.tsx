"use client";

import {
  Home,
  LayoutGrid,
  PackageOpen,
  Vote,
  LibraryBig,
  Menu,
  CalendarRange,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import NavbarSearch from "./navbar-search";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "../ui/button";
import { memo, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type NavbarLink = {
  name: string;
  icon: LucideIcon;
  href: string;
  requireAuth: boolean;
};

const links: NavbarLink[] = [
  { name: "Home", icon: Home, href: "/", requireAuth: true },
  {
    name: "Gravity",
    icon: Vote,
    href: "/gravity",
    requireAuth: true,
  },
  {
    name: "Objekts",
    icon: LibraryBig,
    href: "/objekts",
    requireAuth: false,
  },
  {
    name: "Collection",
    icon: PackageOpen,
    href: "/collection",
    requireAuth: true,
  },
  {
    name: "COMO",
    icon: CalendarRange,
    href: "/como",
    requireAuth: true,
  },
  {
    name: "Grid",
    icon: LayoutGrid,
    href: "/grid",
    requireAuth: true,
  },
];

export default function Links({ authenticated }: { authenticated: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <div className="flex grow justify-end md:justify-center">
      {/* desktop */}
      <div className="md:flex flex-row items-center gap-8 hidden">
        <LinkIcons path={path} authenticated={authenticated} />
      </div>

      {/* mobile */}
      <div className="md:hidden flex flex-row items-center">
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
            <LinkIcons path={path} authenticated={authenticated} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

type LinkProps = {
  path: string;
  authenticated: boolean;
};

const LinkIcons = memo(function LinkIcons({ path, authenticated }: LinkProps) {
  return (
    <>
      {links.map((link, i) => (
        <LinkButton
          key={i}
          link={link}
          active={link.href === "/" ? path === "/" : path.startsWith(link.href)}
          authenticated={authenticated}
        />
      ))}

      <NavbarSearch />
    </>
  );
});

type LinkButtonProps = {
  link: NavbarLink;
  active: boolean;
  authenticated: boolean;
};

const LinkButton = memo(function LinkButton({
  link,
  active,
  authenticated,
}: LinkButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger>
          <Link
            href={{ pathname: link.href }}
            className="drop-shadow-lg hover:scale-110 transition-all"
            aria-label={link.name}
          >
            <link.icon
              className={cn(
                "h-8 w-8 shrink-0 transition-all fill-transparent",
                active && "fill-white/50",
                link.requireAuth &&
                  !authenticated &&
                  "text-slate-500 cursor-not-allowed"
              )}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent className="hidden sm:block">
          <p>
            {authenticated || (!link.requireAuth && !authenticated)
              ? link.name
              : "Sign in first!"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
