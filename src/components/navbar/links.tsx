"use client";

import {
  Home,
  LayoutGrid,
  PackageOpen,
  Vote,
  LibraryBig,
  Menu,
  LucideIcon,
  CalendarRange,
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
import { Fragment, memo, useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { TokenPayload } from "@/lib/universal/auth";

type NavbarLink = {
  name: string;
  icon: LucideIcon;
  href: (user?: TokenPayload) => string;
  requireAuth: boolean;
};

const links: NavbarLink[] = [
  { name: "Home", icon: Home, href: () => "/", requireAuth: true },
  {
    name: "Gravity",
    icon: Vote,
    href: () => "/gravity",
    requireAuth: true,
  },
  {
    name: "Objekts",
    icon: LibraryBig,
    href: () => "/objekts",
    requireAuth: false,
  },
  {
    name: "Collection",
    icon: PackageOpen,
    href: (user) => (user ? `/@${user.nickname}` : "/"),
    requireAuth: true,
  },
  {
    name: "COMO",
    icon: CalendarRange,
    href: (user) => (user ? `/@${user.nickname}/como` : "/"),
    requireAuth: true,
  },
  {
    name: "Grid",
    icon: LayoutGrid,
    href: () => "/grid",
    requireAuth: true,
  },
];

export default function Links({ user }: { user?: TokenPayload }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  return (
    <div className="flex grow justify-end md:justify-center">
      {/* desktop */}
      <div className="md:flex flex-row items-center gap-8 hidden">
        <LinkIcons path={path} user={user} />
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
            <LinkIcons path={path} user={user} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

type LinkProps = {
  path: string;
  user?: TokenPayload;
};

const LinkIcons = memo(function LinkIcons({ path, user }: LinkProps) {
  return (
    <Fragment>
      {links.map((link, i) => {
        const href = link.href(user);
        return (
          <LinkButton
            key={i}
            link={link}
            active={href === "/" ? path === "/" : path === href}
            user={user}
          />
        );
      })}

      <NavbarSearch authenticated={user !== undefined} />
    </Fragment>
  );
});

type LinkButtonProps = {
  link: NavbarLink;
  active: boolean;
  user?: TokenPayload;
};

const LinkButton = memo(function LinkButton({
  link,
  active,
  user,
}: LinkButtonProps) {
  const authenticated = user !== undefined;
  const pathname = link.href(user);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger>
          <Link
            href={{ pathname }}
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
