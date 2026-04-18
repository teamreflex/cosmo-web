import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconSearch, IconX } from "@tabler/icons-react";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

const route = getRouteApi("/");

export default function FilterSearch() {
  const search = route.useSearch({
    select: (params) => params.search,
  });
  const [query, setQuery] = useState(() => search ?? undefined);
  const navigate = route.useNavigate();

  const setDebounced = useDebounceCallback((term: string | undefined) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        search: term,
      }),
      replace: true,
    });
  }, 500);

  function set(term: string | undefined) {
    setQuery(term);
    setDebounced(term);
  }

  return (
    <div
      className={cn(
        "flex h-8 w-48 min-w-0 items-center gap-1.5 rounded-sm border border-border bg-transparent px-2.5 font-mono transition-colors",
        "focus-within:border-cosmo/60",
      )}
    >
      <IconSearch className="size-3.5 shrink-0 text-muted-foreground" />
      <input
        id="filter-search"
        type="text"
        placeholder={m.common_search_placeholder()}
        value={query ?? ""}
        onChange={(e) => set(e.currentTarget.value || undefined)}
        className="h-full w-full grow bg-transparent text-xs tracking-[0.08em] outline-none placeholder:text-muted-foreground"
        maxLength={32}
      />

      {query && (
        <button
          type="button"
          onClick={() => set(undefined)}
          aria-label={m.aria_clear_search()}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconX className="size-3.5" />
        </button>
      )}
    </div>
  );
}
