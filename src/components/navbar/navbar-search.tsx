"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserSearch } from "../user-search";
import { Search } from "lucide-react";
import { useSearchStore } from "@/store";
import { Route } from "next";
import { cn } from "@/lib/utils";
import { SearchUser } from "@/lib/universal/cosmo/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export default function NavbarSearch() {
  const recent = useSearchStore((state) => state.recentLookups);
  const addRecent = useSearchStore((state) => state.addRecentLookup);

  const [open, setOpen] = useState(false);

  const router = useRouter();
  function onSelect(user: SearchUser) {
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
              className="drop-shadow-lg hover:scale-110 transition-all outline-none"
              aria-label="Search for user"
              onClick={() => setOpen(true)}
            >
              <Search
                className={cn(
                  "h-8 w-8 shrink-0 transition-all fill-transparent",
                  open && "fill-white/50"
                )}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>User Search</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </UserSearch>
  );
}
