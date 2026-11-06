import { m } from "@/i18n/messages";
import { useSearchStore } from "@/store";
import type { CosmoPublicUser } from "@apollo/cosmo/types/user";
import { accountName } from "@apollo/util";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { UserSearch } from "../user-search";
import {
  filterChipClassName,
  filterChipValueClassName,
} from "./filter-chip-styles";

type Props = {
  user: CosmoPublicUser | null;
  setUser: (user: CosmoPublicUser | null) => void;
};

/**
 * Narrows transfers to the ones exchanged with one user.
 */
export default function TransferUserFilter({ user, setUser }: Props) {
  const recent = useSearchStore((state) => state.recentLookups);
  const [open, setOpen] = useState(false);
  const active = user !== null;

  function onSelect(selected: CosmoPublicUser) {
    setOpen(false);
    setUser(selected);
  }

  return (
    <UserSearch
      open={open}
      onOpenChange={setOpen}
      onSelect={onSelect}
      recent={recent}
    >
      <div
        className={filterChipClassName(active)}
        data-active={active || undefined}
      >
        <button
          type="button"
          className="flex items-center gap-2"
          onClick={() => setOpen(true)}
        >
          <span>{m.filter_user()}</span>
          <span className={filterChipValueClassName(active)}>
            <span className="max-w-32 truncate">
              {user ? accountName(user.nickname) : m.filter_value_any()}
            </span>
          </span>
          {!active && (
            <IconChevronDown className="size-3 text-muted-foreground" />
          )}
        </button>
        {active && (
          <button
            type="button"
            aria-label={m.filter_user_clear()}
            onClick={() => setUser(null)}
          >
            <IconX className="size-3 text-muted-foreground transition-colors hover:text-foreground" />
          </button>
        )}
      </div>
    </UserSearch>
  );
}
