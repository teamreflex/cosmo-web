import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconSearch, IconX } from "@tabler/icons-react";
import { noop } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

/**
 * The first search runs once the Typesense client has downloaded, so focusing
 * the input starts that. It sits outside the component because the React
 * Compiler skips a component that contains a dynamic import, and an
 * uncompiled one would rebuild its debounce on every keystroke.
 */
function preloadSearchClient() {
  void import("@/lib/client/typesense").catch(noop);
}

export default function FilterSearch() {
  const search = useSearch({
    from: "/",
    select: (params) => params.search,
  });
  const [query, setQuery] = useState(() => search ?? undefined);
  const navigate = useNavigate({ from: "/" });

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
        "flex h-8 w-48 min-w-0 items-center gap-1.5 rounded-sm border border-border bg-transparent px-2.5 transition-colors",
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
        onFocus={preloadSearchClient}
        className="h-full w-full grow bg-transparent text-xs outline-none placeholder:text-xs placeholder:text-muted-foreground any-pointer-coarse:text-base"
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
