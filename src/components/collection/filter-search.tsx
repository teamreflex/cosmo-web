import { X } from "lucide-react";
import { getRouteApi } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { m } from "@/i18n/messages";

const route = getRouteApi("/");

export default function FilterSearch() {
  const { search } = route.useSearch();
  const navigate = route.useNavigate();

  function setQuery(query: string | undefined) {
    navigate({
      search: (prev) => ({
        ...prev,
        search: query,
      }),
    });
  }

  return (
    <div
      className={cn(
        "flex h-9 w-48 min-w-0 items-center gap-2 rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
      )}
    >
      <input
        type="text"
        placeholder={m.common_search_placeholder()}
        value={search ?? ""}
        onChange={(e) => setQuery(e.currentTarget.value || undefined)}
        className="h-full w-full grow py-1 pl-3 text-base outline-none md:text-sm"
        maxLength={32}
      />

      <button type="button" onClick={() => setQuery(undefined)}>
        <X className="mr-3 h-4 w-4" />
      </button>
    </div>
  );
}
