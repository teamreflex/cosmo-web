"use client";

import { TokenPayload } from "@/lib/universal/auth";
import { usePathname } from "next/navigation";
import NavbarSearch from "./navbar-search";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NavbarLink } from "./links";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import {
  Home,
  LayoutGrid,
  PackageOpen,
  Vote,
  CalendarRange,
  Disc3,
  CircleUserRound,
} from "lucide-react";
import { IconCards, IconRotate360 } from "@tabler/icons-react";

type LinksProps = {
  user?: TokenPayload;
};

export function DesktopLinks({ user }: LinksProps) {
  const path = usePathname();

  return (
    <div className="contents">
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
    </div>
  );
}

export function MobileLinks({ user }: LinksProps) {
  const path = usePathname();
  const authenticated = user !== undefined;

  return (
    <div className="contents">
      {links.map((link) => {
        const href = link.href(user);
        const active = href === "/" ? path === "/" : path === href;
        const disabled = link.requireAuth && !authenticated;
        const prefetch = disabled === false && link.prefetch === true;

        return (
          <DropdownMenuItem key={href} disabled={disabled} asChild>
            <Link href={href} aria-label={link.name} prefetch={prefetch}>
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
    </div>
  );
}

type LinkButtonProps = {
  link: NavbarLink;
  active: boolean;
  user?: TokenPayload;
};

function LinkButton({ link, active, user }: LinkButtonProps) {
  const authenticated = user !== undefined;
  const pathname = link.href(user);
  const disabled = link.requireAuth && !authenticated;
  const prefetch = disabled === false && link.prefetch === true;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger>
          <Link
            href={{ pathname }}
            className="drop-shadow-lg outline-hidden focus:outline-hidden"
            aria-label={link.name}
            prefetch={prefetch}
          >
            <link.icon
              className={cn(
                "h-8 w-8 shrink-0 transition-all fill-transparent",
                active && "fill-white/50",
                disabled && "text-slate-500 cursor-not-allowed"
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
}

const links: NavbarLink[] = [
  {
    name: "Home",
    icon: Home,
    href: () => "/",
    requireAuth: true,
    prefetch: null,
  },
  {
    name: "Rekord",
    icon: Disc3,
    href: () => "/rekord",
    requireAuth: true,
    prefetch: null,
  },
  {
    name: "Gravity",
    icon: Vote,
    href: () => "/gravity",
    requireAuth: true,
    prefetch: null,
  },
  {
    name: "Objekts",
    icon: IconCards,
    href: () => "/objekts",
    requireAuth: false,
    prefetch: true,
  },
  {
    name: "Collection",
    icon: PackageOpen,
    href: (user) => (user ? `/@${user.nickname}` : "/"),
    requireAuth: true,
    prefetch: true,
  },
  {
    name: "COMO",
    icon: CalendarRange,
    href: (user) => (user ? `/@${user.nickname}/como` : "/"),
    requireAuth: true,
    prefetch: null,
  },
  {
    name: "Grid",
    icon: LayoutGrid,
    href: () => "/grid",
    requireAuth: true,
    prefetch: null,
  },
  {
    name: "Spin",
    icon: IconRotate360,
    href: () => "/spin",
    requireAuth: true,
    prefetch: null,
  },
  {
    name: "Activity",
    icon: CircleUserRound,
    href: () => "/activity",
    requireAuth: true,
    prefetch: null,
  },
];
