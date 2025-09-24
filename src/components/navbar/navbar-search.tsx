import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { UserSearch } from "../user-search";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import type { CosmoPublicUser } from "@/lib/universal/cosmo/user";
import { useSearchStore } from "@/store";

export default function NavbarSearch() {
  const recent = useSearchStore((state) => state.recentLookups);
  const addRecent = useSearchStore((state) => state.addRecentLookup);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function onSelect(user: CosmoPublicUser) {
    setOpen(false);
    addRecent({
      nickname: user.nickname,
      address: user.address,
      profileImageUrl: user.profileImageUrl,
    });
    navigate({ to: `/@${user.nickname}` });
  }

  return (
    <UserSearch
      open={open}
      onOpenChange={setOpen}
      onSelect={onSelect}
      recent={recent}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="drop-shadow-lg outline-hidden focus:outline-hidden"
              aria-label="Search for user"
              onClick={() => setOpen(true)}
            >
              <Search className="h-8 w-8 shrink-0 transition-all fill-transparent" />
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
