import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconLoader2 } from "@tabler/icons-react";
import { ofetch } from "ofetch";
import { useDebounceValue } from "usehooks-ts";
import { isAddress } from "@apollo/util";
import { DialogClose } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Command } from "./ui/command";
import type { RecentUser } from "@/store";
import type {
  CosmoPublicUser,
  CosmoSearchResult,
} from "@apollo/cosmo/types/user";
import type { PropsWithChildren } from "react";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { m } from "@/i18n/messages";

type Props = PropsWithChildren<{
  placeholder?: string;
  recent?: RecentUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (user: CosmoPublicUser) => void;
}>;

export function UserSearch({
  children,
  recent = [],
  placeholder,
  open,
  onOpenChange,
  onSelect,
}: Props) {
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery] = useDebounceValue<string>(query, 500);
  const queryIsAddress = isAddress(debouncedQuery);
  const enableQuery = debouncedQuery.length > 0 && queryIsAddress === false;

  const { status, data, dataUpdatedAt } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: async () => {
      return await ofetch<CosmoSearchResult>(`/api/bff/v3/users/search`, {
        query: {
          query: debouncedQuery,
        },
        retry: 1,
      }).then((res) => res.results);
    },
    enabled: enableQuery,
    retry: false,
  });

  const showResults =
    queryIsAddress || (status === "success" && dataUpdatedAt > 0);

  // filter out recent users who exist in the search results
  const recentUsers = data
    ? recent.filter((r) => !data.some((u) => u.nickname === r.nickname))
    : recent;

  function selectResult(user: CosmoPublicUser) {
    setQuery("");
    onSelect(user);
  }

  function selectAddress(address: string) {
    setQuery("");
    onSelect({
      nickname: address,
      address,
      profileImageUrl: "",
      userProfiles: [],
    });
  }

  function selectRecent(user: RecentUser) {
    setQuery("");
    onSelect({
      ...user,
      userProfiles: [],
    });
  }

  function handleClose() {
    setQuery("");
    onOpenChange(false);
  }

  return (
    <div className="contents">
      {children}

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        showCloseButton={false}
        title={m.common_user_search()}
        description={m.user_search_placeholder()}
      >
        <Command>
          <Notice
            className="bg-destructive/10 text-destructive"
            enabled={status === "error"}
          >
            <p>{m.user_search_error()}</p>
          </Notice>

          <CommandInput
            autoFocus={true}
            className="touch-manipulation text-[16px]"
            name="query"
            placeholder={placeholder ?? m.user_search_placeholder()}
            value={query}
            onValueChange={setQuery}
            onClose={handleClose}
          />

          <CommandList>
            {status === "pending" && enableQuery && (
              <div className="flex items-center justify-center py-2">
                <IconLoader2 className="h-8 w-8 animate-spin" />
              </div>
            )}

            {status === "success" && data.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold">
                {m.user_search_no_results()}
              </div>
            )}

            {showResults && (
              <CommandGroup heading={m.user_search_results()}>
                {queryIsAddress && (
                  <CommandItem
                    onSelect={() => selectAddress(debouncedQuery)}
                    className="cursor-pointer"
                  >
                    {debouncedQuery}
                  </CommandItem>
                )}

                {status === "success" &&
                  data.length > 0 &&
                  data.map((user) => (
                    <CommandItem
                      key={user.address}
                      onSelect={() => selectResult(user)}
                      className="cursor-pointer gap-2"
                      value={user.nickname}
                    >
                      <UserAvatar nickname={user.nickname} />
                      <span>{user.nickname}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {recentUsers.length > 0 && (
              <CommandGroup heading={m.user_search_recent()}>
                {recentUsers.map((user) => (
                  <CommandItem
                    key={user.address}
                    className="cursor-pointer"
                    onSelect={() => selectRecent(user)}
                    value={user.nickname}
                  >
                    {user.nickname}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}

type UserResultProps = {
  nickname: string;
};

function UserAvatar({ nickname }: UserResultProps) {
  return (
    <Avatar className="h-5 w-5">
      <AvatarFallback>{nickname.charAt(0).toUpperCase()}</AvatarFallback>
      <AvatarImage
        className="bg-cosmo-profile p-1"
        src="/profile.webp"
        alt={nickname}
      />
    </Avatar>
  );
}

type NoticeProps = PropsWithChildren<{
  enabled: boolean;
  className?: string;
}>;

function Notice({ children, className, enabled }: NoticeProps) {
  return (
    <div
      data-enabled={enabled}
      className={cn(
        "-m-1 mb-1 hidden h-8 items-center justify-between px-4 text-xs font-semibold data-[enabled=true]:flex",
        className,
      )}
    >
      {children}
      <DialogClose />
    </div>
  );
}
