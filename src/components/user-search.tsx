"use client";

import { PropsWithChildren, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SearchUser } from "@/lib/server/cosmo";
import { useQuery } from "react-query";
import { useDebounce } from "usehooks-ts";
import { HeartCrack, Loader2 } from "lucide-react";

type Props = PropsWithChildren<{
  placeholder?: string;
  recent: SearchUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (user: SearchUser) => void;
}>;

export function UserSearch({
  children,
  recent,
  placeholder,
  open,
  onOpenChange,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce<string>(query, 500);

  const result = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: async () => {
      const response = await fetch(
        `/api/user/v1/search?query=${debouncedQuery}`
      );
      return (await response.json()) as SearchUser[];
    },
    enabled: debouncedQuery.length > 3,
  });

  // reset query before triggering handler
  function select(user: SearchUser) {
    setQuery("");
    onSelect(user);
  }

  return (
    <>
      {children}

      <CommandDialog open={open} onOpenChange={onOpenChange}>
        <CommandInput
          name="query"
          placeholder={placeholder ?? "Search for a user..."}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {result.status === "loading" ? (
            <CommandEmpty className="flex items-center justify-center py-2">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CommandEmpty>
          ) : result.status === "error" ? (
            <CommandEmpty className="flex items-center justify-center gap-2 py-2">
              <HeartCrack className="h-8 w-8" />
              <p className="text-semibold">Error searching for users</p>
            </CommandEmpty>
          ) : (
            result.data && (
              <CommandGroup heading="Results">
                {result.data.map((user) => (
                  <CommandItem
                    key={user.address}
                    onSelect={() => select(user)}
                    className="cursor-pointer"
                  >
                    {user.nickname}
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          )}
          {recent.length > 0 && (
            <CommandGroup heading="Recent">
              {recent.map((user) => (
                <CommandItem
                  key={user.address}
                  onSelect={() => select(user)}
                  className="cursor-pointer"
                >
                  {user.nickname}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
