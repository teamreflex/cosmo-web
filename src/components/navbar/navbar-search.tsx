"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserSearch } from "../user-search";
import { Search } from "lucide-react";
import { useSearchStore } from "@/store";
import { Route } from "next";
import { cn } from "@/lib/utils";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

type Props = {
  authenticated: boolean;
};

export default function NavbarSearch({ authenticated }: Props) {
  const recent = useSearchStore((state) => state.recentLookups);
  const addRecent = useSearchStore((state) => state.addRecentLookup);

  const [open, setOpen] = useState(false);

  const router = useRouter();
  function onSelect(user: PublicProfile) {
    setOpen(false);
    addRecent(user);
    router.push(`/@${user.nickname}` as Route);
  }

  return (
    <UserSearch
      open={open}
      onOpenChange={setOpen}
      onSelect={onSelect}
      recent={recent}
    >
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="drop-shadow-lg outline-none"
              aria-label="Search for user"
              onClick={() => setOpen(true)}
              disabled={!authenticated}
            >
              <Search
                className={cn(
                  "h-8 w-8 shrink-0 transition-all fill-transparent",
                  !authenticated && "text-slate-500 cursor-not-allowed"
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{authenticated ? "User Search" : "Sign in first!"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </UserSearch>
  );
}
