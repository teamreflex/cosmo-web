"use client";

import { PropsWithChildren, useState } from "react";
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle, Loader2 } from "lucide-react";
import { isAddress } from "viem";
import { CosmoPublicUser, CosmoSearchResult } from "@/lib/universal/cosmo/auth";
import { ofetch } from "ofetch";
import { env } from "@/env";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useDebounceValue } from "usehooks-ts";
import ProfileImage from "@/assets/profile.webp";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { RecentUser } from "@/store";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import VisuallyHidden from "./ui/visually-hidden";
import { useUserState } from "@/hooks/use-user-state";
import { cn } from "@/lib/utils";

type Props = PropsWithChildren<{
  placeholder?: string;
  recent?: RecentUser[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (user: CosmoPublicUser) => void;
  authenticated?: boolean;
}>;

export function UserSearch({
  children,
  recent = [],
  placeholder,
  open,
  onOpenChange,
  onSelect,
  authenticated = false,
}: Props) {
  const { artist } = useUserState();
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery] = useDebounceValue<string>(query, 500);
  const queryIsAddress = isAddress(debouncedQuery);
  const enableQuery = debouncedQuery.length > 3 && queryIsAddress === false;

  const { status, data } = useQuery({
    queryKey: ["user-search", debouncedQuery],
    queryFn: async () => {
      return await ofetch<CosmoSearchResult>(`/api/user/v1/search`, {
        query: { query: debouncedQuery },
        retry: 1,
      }).then((res) => res.results);
    },
    enabled: enableQuery,
    retry: false,
  });

  const showClose = status !== "error" && authenticated;

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
      profile: [],
    });
  }

  function selectRecent(user: RecentUser) {
    setQuery("");
    onSelect({
      ...user,
      profile: [],
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
            <DialogTitle>User Search</DialogTitle>
            <DialogDescription>Search for a user...</DialogDescription>
          </DialogHeader>
        </VisuallyHidden>

        <NoticeGuest enabled={authenticated === false} />
        <Notice className="bg-red-600" enabled={status === "error"}>
          <p>COSMO error, try again soon</p>
        </Notice>

        <CommandInput
          autoFocus={true}
          className="touch-manipulation"
          name="query"
          placeholder={placeholder ?? "Search for a user..."}
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
            <div className="flex items-center justify-center text-sm font-semibold gap-2 py-2">
              No users found
            </div>
          )}

          <CommandGroup heading="Results">
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
                  className="gap-2 cursor-pointer"
                  value={user.nickname}
                >
                  <UserAvatar artist={artist} user={user} />
                  <span>{user.nickname}</span>
                </CommandItem>
              ))}
          </CommandGroup>

          {recentUsers.length > 0 && (
            <CommandGroup heading="Recent">
              {recentUsers.map((user) => (
                <CommandItem
                  key={user.address}
                  onSelect={() => selectRecent(user)}
                  className="cursor-pointer"
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
  artist: ValidArtist;
  user: CosmoPublicUser;
};

function UserAvatar({ artist, user }: UserResultProps) {
  const profile = user.profile.find(
    (p) => p.artistName.toLowerCase() === artist.toLowerCase()
  );

  return (
    <Avatar className="h-5 w-5">
      <AvatarFallback>{user.nickname.charAt(0).toUpperCase()}</AvatarFallback>

      {profile !== undefined ? (
        <AvatarImage src={profile.image.thumbnail} alt={user.nickname} />
      ) : (
        <AvatarImage
          className="bg-cosmo-profile p-1"
          src={ProfileImage.src}
          alt={user.nickname}
        />
      )}
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
        "items-center justify-between px-4 text-xs font-semibold h-8 hidden data-[enabled=true]:flex",
        className
      )}
    >
      {children}
      <DialogClose />
    </div>
  );
}

function NoticeGuest({ enabled }: { enabled: boolean }) {
  return (
    <Notice className="bg-cosmo" enabled={enabled}>
      <div className="flex gap-2 items-center">
        <p>Sign in to fully search COSMO</p>

        <Popover>
          <PopoverTrigger asChild>
            <button>
              <HelpCircle className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto max-w-[22rem]" asChild>
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-semibold">
                COSMO requires signing in to search for users.
              </p>
              <p>
                Any search queries while not signed in will be made against
                accounts that have been saved into the{" "}
                {env.NEXT_PUBLIC_APP_NAME} system, which does not include all
                accounts.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Notice>
  );
}
