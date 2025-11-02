import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ofetch } from "ofetch";
import { useDebounceValue } from "usehooks-ts";
import { isAddress } from "@apollo/util";
import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import VisuallyHidden from "./ui/visually-hidden";
import type { RecentUser } from "@/store";
import type {
  CosmoPublicUser,
  CosmoSearchResult,
} from "@/lib/universal/cosmo/user";
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

  const { status, data } = useQuery({
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

  const showClose = status !== "error";

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

  return (
    <div className="contents">
      {children}

      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        showClose={showClose}
      >
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>{m.common_user_search()}</DialogTitle>
            <DialogDescription>{m.user_search_placeholder()}</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        <Notice className="bg-red-600" enabled={status === "error"}>
          <p>{m.user_search_error()}</p>
        </Notice>

        <CommandInput
          autoFocus={true}
          className="touch-manipulation"
          name="query"
          placeholder={placeholder ?? m.user_search_placeholder()}
          value={query}
          onValueChange={setQuery}
        />

        <CommandList>
          {status === "pending" && enableQuery && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {status === "success" && data.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm font-semibold">
              {m.user_search_no_results()}
            </div>
          )}

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
        "hidden h-8 items-center justify-between px-4 text-xs font-semibold data-[enabled=true]:flex",
        className,
      )}
    >
      {children}
      <DialogClose />
    </div>
  );
}
