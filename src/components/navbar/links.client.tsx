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
  LuLayoutGrid,
  LuPackageOpen,
  LuVote,
  LuCalendarRange,
  LuDisc3,
  LuCircleUserRound,
  LuHouse,
} from "react-icons/lu";
import { TbCards } from "react-icons/tb";

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

        return (
          <DropdownMenuItem key={href} disabled={disabled} asChild>
            <Link href={href} aria-label={link.name}>
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

export function LinkButton({ link, active, user }: LinkButtonProps) {
  const authenticated = user !== undefined;
  const pathname = link.href(user);
  const disabled = link.requireAuth && !authenticated;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger>
          <Link
            href={{ pathname }}
            className="drop-shadow-lg outline-hidden focus:outline-hidden"
            aria-label={link.name}
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
    icon: LuHouse,
    href: () => "/",
    requireAuth: true,
  },
  {
    name: "Rekord",
    icon: LuDisc3,
    href: () => "/rekord",
    requireAuth: true,
  },
  {
    name: "Gravity",
    icon: LuVote,
    href: () => "/gravity",
    requireAuth: true,
  },
  {
    name: "Objekts",
    icon: TbCards,
    href: () => "/objekts",
    requireAuth: false,
  },
  {
    name: "Collection",
    icon: LuPackageOpen,
    href: (user) => (user ? `/@${user.nickname}` : "/"),
    requireAuth: true,
  },
  {
    name: "COMO",
    icon: LuCalendarRange,
    href: (user) => (user ? `/@${user.nickname}/como` : "/"),
    requireAuth: true,
  },
  {
    name: "Grid",
    icon: LuLayoutGrid,
    href: () => "/grid",
    requireAuth: true,
  },
  {
    name: "Activity",
    icon: LuCircleUserRound,
    href: () => "/activity",
    requireAuth: true,
  },
];
