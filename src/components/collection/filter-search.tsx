import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useQueryState } from "nuqs";

export default function FilterSearch() {
  const [query, setQuery] = useQueryState("search");

  return (
    <div
      className={cn(
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex items-center gap-2 h-9 w-48 min-w-0 rounded-md border bg-transparent shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]"
      )}
    >
      <input
        type="text"
        placeholder="Search..."
        value={query ?? ""}
        onChange={(e) => setQuery(e.currentTarget.value || null)}
        className="pl-3 py-1 text-base md:text-sm h-full w-full grow outline-none"
        maxLength={32}
      />

      <button type="button" onClick={() => setQuery(null)}>
        <X className="w-4 h-4 mr-3" />
      </button>
    </div>
  );
}
