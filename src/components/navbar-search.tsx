"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserSearch } from "./user-search";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Search } from "lucide-react";
import { SearchUser } from "@/lib/server/cosmo";
import { useSearchStore } from "@/store";

export default function NavbarSearch() {
  const recent = useSearchStore((state) => state.recentLookups);
  const addRecent = useSearchStore((state) => state.addRecentLookup);

  const [open, setOpen] = useState(false);

  const router = useRouter();
  function onSelect(user: SearchUser) {
    setOpen(false);
    addRecent(user);
    router.push(`/u/${user.nickname}`);
  }

  return (
    <UserSearch
      open={open}
      onOpenChange={setOpen}
      onSelect={onSelect}
      recent={recent}
    >
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            className="drop-shadow-lg hover:scale-110 transition-all"
            aria-label="Search for user"
            onClick={() => setOpen(true)}
          >
            <Search className="h-8 w-8 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Search</p>
        </TooltipContent>
      </Tooltip>
    </UserSearch>
  );
}
