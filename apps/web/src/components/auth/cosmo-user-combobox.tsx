import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import type {
  CosmoPublicUser,
  CosmoSearchResult,
} from "@apollo/cosmo/types/user";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";

type Props = {
  artistId: ValidArtist;
  value: CosmoPublicUser | null;
  onChange: (user: CosmoPublicUser | null) => void;
};

export default function CosmoUserCombobox({
  artistId,
  value,
  onChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(query, 500);
  const [open, setOpen] = useState(false);

  const { status, data } = useQuery({
    queryKey: ["cosmo-user-search", debouncedQuery],
    queryFn: async () => {
      return await ofetch<CosmoSearchResult>("/api/bff/v3/users/search", {
        query: { query: debouncedQuery },
        retry: 1,
      }).then((res) => res.results);
    },
    enabled: debouncedQuery.length > 0,
    retry: false,
  });

  function handleSelect(user: CosmoPublicUser) {
    onChange(user);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setQuery("");
  }

  function getProfileImage(user: CosmoPublicUser): string | undefined {
    const profile = user.userProfiles.find((p) => p.artistId === artistId);
    return profile?.image.thumbnail;
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-input bg-transparent px-3 py-2">
        <Avatar className="size-8">
          <AvatarImage src={getProfileImage(value)} alt={value.nickname} />
          <AvatarFallback>
            {value.nickname.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="flex-1 text-sm font-medium">{value.nickname}</span>
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
        className="w-(--radix-popover-trigger-width) p-0 overflow-hidden"
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
                key={user.address}
                type="button"
                onClick={() => handleSelect(user)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  "hover:bg-accent focus:bg-accent focus:outline-none",
                )}
              >
                <Avatar className="size-8">
                  <AvatarImage
                    src={getProfileImage(user)}
                    alt={user.nickname}
                  />
                  <AvatarFallback>
                    {user.nickname.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{user.nickname}</span>
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
