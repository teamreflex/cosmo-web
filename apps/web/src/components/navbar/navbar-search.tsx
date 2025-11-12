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
import type { CosmoPublicUser } from "@apollo/cosmo/types/user";
import { useSearchStore } from "@/store";
import { m } from "@/i18n/messages";

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
              className="outline-hidden drop-shadow-lg focus:outline-hidden"
              aria-label={m.navbar_search_user()}
              onClick={() => setOpen(true)}
            >
              <Search className="h-8 w-8 shrink-0 fill-transparent transition-all" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{m.common_user_search()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </UserSearch>
  );
}
