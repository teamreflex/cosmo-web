"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserSearch } from "../user-search";
import { Search } from "lucide-react";
import { SearchUser } from "@/lib/universal/cosmo";
import { useSearchStore } from "@/store";
import { Route } from "next";

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
      <button
        className="drop-shadow-lg hover:scale-110 transition-all"
        aria-label="Search for user"
        onClick={() => setOpen(true)}
      >
        <Search className="h-8 w-8 shrink-0" />
      </button>
    </UserSearch>
  );
}
