"use client";

import { PropsWithChildren, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "usehooks-ts";
import { HeartCrack, Loader2 } from "lucide-react";
import { isAddress } from "ethers/lib/utils";
import { SearchUser } from "@/lib/universal/cosmo/auth";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { ofetch } from "ofetch";

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
  const queryIsAddress = useMemo(
    () => isAddress(debouncedQuery),
    [debouncedQuery]
  );

  const result = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: async () => {
      return await ofetch<{ results: SearchUser[] }>(
        `${COSMO_ENDPOINT}/user/v1/search`,
        {
          query: {
            query: debouncedQuery,
          },
        }
      ).then((res) => res.results);
    },
    enabled: debouncedQuery.length > 3 && queryIsAddress === false,
  });

  // reset query before triggering handler
  function select(user: SearchUser) {
    setQuery("");
    onSelect(user);
  }

  function selectAddress(address: string) {
    setQuery("");
    onSelect({
      address,
      nickname: address,
      profileImageUrl: "",
      isAddress: true,
      privacy: {
        nickname: false,
        objekts: false,
        como: false,
        trades: false,
      },
    });
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
          {result.status === "pending" ? (
            <CommandEmpty className="flex items-center justify-center py-2">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CommandEmpty>
          ) : result.status === "error" ? (
            <CommandEmpty className="flex items-center justify-center gap-2 py-2">
              <HeartCrack className="h-8 w-8" />
              <p className="text-semibold">Error searching for users</p>
            </CommandEmpty>
          ) : (
            <CommandGroup heading="Results">
              {queryIsAddress && (
                <CommandItem
                  onSelect={() => selectAddress(debouncedQuery)}
                  className="cursor-pointer"
                >
                  {debouncedQuery}
                </CommandItem>
              )}
              {result.data &&
                result.data.map((user) => (
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
