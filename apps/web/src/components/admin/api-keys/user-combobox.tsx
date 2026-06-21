import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { searchUsersQuery } from "@/lib/queries/api-keys";
import type { UserSearchResult } from "@/lib/universal/api-keys";
import { cn } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";

type Props = {
  value: UserSearchResult | null;
  onChange: (user: UserSearchResult | null) => void;
};

// App-user search combobox (better-auth `user` table), mirroring the cosmo
// combobox's look/behavior but resolving to an app `user.id`.
export default function UserCombobox({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(query, 500);
  const [open, setOpen] = useState(false);

  const { status, data } = useQuery({
    ...searchUsersQuery(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  function handleSelect(user: UserSearchResult) {
    onChange(user);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setQuery("");
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-input bg-transparent px-3 py-2">
        <Avatar className="size-8">
          <AvatarFallback>
            {(value.username ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 text-sm font-medium">{value.username}</span>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {m.common_cancel()}
        </button>
      </div>
    );
  }

  return (
    <Popover open={open && debouncedQuery.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          placeholder={m.user_search_placeholder()}
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
      </PopoverAnchor>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {status === "pending" && debouncedQuery.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <IconLoader2 className="size-5 animate-spin" />
          </div>
        )}

        {status === "success" && data.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            {m.user_search_no_results()}
          </div>
        )}

        {status === "success" && data.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            {data.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => handleSelect(user)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  "hover:bg-accent focus:bg-accent focus:outline-none",
                )}
              >
                <Avatar className="size-8">
                  <AvatarFallback>
                    {(user.username ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{user.username}</span>
              </button>
            ))}
          </div>
        )}

        {status === "error" && (
          <div className="py-4 text-center text-sm text-destructive">
            {m.user_search_error()}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
