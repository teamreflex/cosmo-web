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
  Disc3,
} from "lucide-react";
import Link from "next/link";
import NavbarSearch from "./navbar-search";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Fragment, memo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { TokenPayload } from "@/lib/universal/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type NavbarLink = {
  name: string;
  icon: LucideIcon;
  href: (user?: TokenPayload) => string;
  requireAuth: boolean;
};

const links: NavbarLink[] = [
  { name: "Home", icon: Home, href: () => "/", requireAuth: true },
  {
    name: "Rekord",
    icon: Disc3,
    href: () => "/rekord",
    requireAuth: true,
  },
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

  const authenticated = user !== undefined;

  return (
    <div className="flex grow justify-end md:justify-center">
      {/* desktop */}
      <div className="md:flex flex-row items-center gap-8 hidden">
        <LinkIcons path={path} user={user} />
      </div>

      {/* mobile */}
      <div className="md:hidden flex flex-row gap-2 items-center">
        <NavbarSearch authenticated={user !== undefined} />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="drop-shadow-lg outline-none" aria-label="Menu">
              <Menu className="h-8 w-8 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Menu</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {links.map((link) => {
              const href = link.href(user);
              const active = href === "/" ? path === "/" : path === href;
              const disabled = link.requireAuth && !authenticated;

              return (
                <DropdownMenuItem key={href} disabled={disabled} asChild>
                  <Link href={href}>
                    <link.icon
                      className={cn(
                        "h-4 w-4 mr-2 shrink-0 transition-all fill-transparent",
                        active && "fill-white/50",
                        disabled && "text-slate-500"
                      )}
                    />
                    <span className={cn(disabled && "text-slate-500")}>
                      {link.name}
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
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
            className="drop-shadow-lg outline-none focus:outline-none"
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
