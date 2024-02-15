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
import { HeartCrack, HelpCircle, Loader2, X } from "lucide-react";
import { isAddress } from "ethers/lib/utils";
import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { ofetch } from "ofetch";
import { defaultProfile } from "@/lib/utils";
import { env } from "@/env.mjs";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DialogClose } from "./ui/dialog";

type Props = PropsWithChildren<{
  placeholder?: string;
  recent: PublicProfile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (user: PublicProfile) => void;
  authenticated?: boolean;
}>;

export function UserSearch({
  children,
  recent,
  placeholder,
  open,
  onOpenChange,
  onSelect,
  authenticated = false,
}: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce<string>(query, 500);
  const queryIsAddress = isAddress(debouncedQuery);

  const { status, data, isFetching } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: async () => {
      return await ofetch<{ results: PublicProfile[] }>(`/api/user/v1/search`, {
        query: {
          query: debouncedQuery,
        },
      }).then((res) => res.results);
    },
    enabled: debouncedQuery.length > 3 && queryIsAddress === false,
  });

  // reset query before triggering handler
  function select(user: PublicProfile) {
    setQuery("");
    onSelect(user);
  }

  function selectAddress(address: string) {
    setQuery("");
    onSelect({
      ...defaultProfile,
      address,
      nickname: address,
    });
  }

  return (
    <>
      {children}

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        showClose={authenticated}
      >
        {authenticated === false && (
          <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold bg-cosmo">
            <div className="flex gap-2 items-center">
              <p>Sign in to fully search Cosmo</p>

              <Popover>
                <PopoverTrigger asChild>
                  <button>
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  className="w-auto max-w-[22rem]"
                  asChild
                >
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="font-semibold">
                      Cosmo requires signing in to search for users.
                    </p>
                    <p>
                      Any search queries while not signed in will be made
                      against accounts that have been saved into the{" "}
                      {env.NEXT_PUBLIC_APP_NAME} system.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <DialogClose />
          </div>
        )}

        <CommandInput
          name="query"
          placeholder={placeholder ?? "Search for a user..."}
          value={query}
          onValueChange={setQuery}
        />

        <CommandList>
          {isFetching && (
            <CommandEmpty className="flex items-center justify-center py-2">
              <Loader2 className="h-8 w-8 animate-spin" />
            </CommandEmpty>
          )}

          {status === "error" && (
            <CommandEmpty className="flex items-center justify-center gap-2 py-2">
              <HeartCrack className="h-8 w-8" />
              <p className="text-semibold">Error searching for users</p>
            </CommandEmpty>
          )}

          {status === "success" && (
            <CommandGroup heading="Results">
              {queryIsAddress && (
                <CommandItem
                  onSelect={() => selectAddress(debouncedQuery)}
                  className="cursor-pointer"
                >
                  {debouncedQuery}
                </CommandItem>
              )}
              {data &&
                data.map((user) => (
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
