"use client";

import { useState } from "react";
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
import { HeartCrack, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function UserSearch() {
  const [open, setOpen] = useState(false);
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

  const router = useRouter();
  function onSelect(nickname: string) {
    setQuery("");
    setOpen(false);
    router.push(`/u/${nickname}`);
  }

  return (
    <>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button
            className="drop-shadow-lg hover:scale-110 transition-all"
            aria-label="Search for user"
            onClick={() => setOpen(true)}
          >
            <Search className="h-8 w-8 shrink-0" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Search</p>
        </TooltipContent>
      </Tooltip>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          name="query"
          placeholder="Search for a user..."
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
                    onSelect={onSelect}
                    className="cursor-pointer"
                  >
                    {user.nickname}
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
