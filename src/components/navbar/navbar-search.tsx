"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserSearch } from "../user-search";
import { LuSearch } from "react-icons/lu";
import { useSearchStore } from "@/store";
import { Route } from "next";
import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
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

  function onSelect(user: CosmoPublicUser) {
    setOpen(false);
    addRecent({
      nickname: user.nickname,
      address: user.address,
      profileImageUrl: user.profileImageUrl,
    });
    router.push(`/@${user.nickname}` as Route);
  }

  return (
    <UserSearch
      open={open}
      onOpenChange={setOpen}
      onSelect={onSelect}
      recent={recent}
      authenticated={authenticated}
    >
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="drop-shadow-lg outline-hidden focus:outline-hidden cursor-pointer"
              aria-label="Search for user"
              onClick={() => setOpen(true)}
            >
              <LuSearch className="h-8 w-8 shrink-0 transition-all fill-transparent" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>User Search</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </UserSearch>
  );
}
