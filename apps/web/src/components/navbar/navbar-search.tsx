import { m } from "@/i18n/messages";
import { useSearchStore } from "@/store";
import type { CosmoPublicUser } from "@apollo/cosmo/types/user";
import { IconSearch } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "../ui/button";
import { UserSearch } from "../user-search";

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
    void navigate({ to: `/@${user.nickname}` });
  }

  return (
    <UserSearch
      open={open}
      onOpenChange={setOpen}
      onSelect={onSelect}
      recent={recent}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={m.navbar_search_user()}
        onClick={() => setOpen(true)}
      >
        <IconSearch className="size-6" />
      </Button>
    </UserSearch>
  );
}
