import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type {
  DefaultError,
  QueryKey,
  UseQueryOptions,
} from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useDebounceValue } from "usehooks-ts";

type Props<T, TQueryKey extends QueryKey> = {
  id?: string;
  value: T | null;
  onChange: (item: T | null) => void;
  search: (query: string) => UseQueryOptions<T[], DefaultError, T[], TQueryKey>;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getSublabel?: (item: T) => string | null;
  getInitial: (item: T) => string;
  placeholder: string;
  invalid?: boolean;
};

/**
 * Searches staff-side records, such as users or linked COSMO accounts, once
 * at least 3 characters are typed, and shows the picked one as a chip with a
 * Clear button that unpicks it.
 */
export default function UserCombobox<T, TQueryKey extends QueryKey>({
  id,
  value,
  onChange,
  search,
  getKey,
  getLabel,
  getSublabel,
  getInitial,
  placeholder,
  invalid,
}: Props<T, TQueryKey>) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(query, 500);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // a picked result swaps the search for the item, whose Clear takes focus
  const picked = useRef(false);
  const enabled = debouncedQuery.length >= 3;
  const resultsOpen = open && enabled;

  const { status, data } = useQuery({
    ...search(debouncedQuery),
    enabled,
  });

  function handleSelect(item: T) {
    picked.current = true;
    onChange(item);
    setQuery("");
    setOpen(false);
  }

  function handleClear() {
    onChange(null);
    setQuery("");
  }

  if (value !== null) {
    return (
      <div
        aria-invalid={invalid}
        className="flex items-center gap-3 rounded-md border border-input bg-transparent px-3 py-2 text-foreground aria-invalid:border-destructive/60"
      >
        <ItemLabel
          initial={getInitial(value)}
          label={getLabel(value)}
          sublabel={getSublabel?.(value) ?? null}
          className="font-medium"
        />
        <button
          ref={(button) => {
            if (button === null || !picked.current) return;
            picked.current = false;
            button.focus();
          }}
          type="button"
          onClick={handleClear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {m.user_search_clear()}
        </button>
      </div>
    );
  }

  return (
    <Popover open={resultsOpen} onOpenChange={setOpen}>
      <Input
        id={id}
        ref={inputRef}
        placeholder={placeholder}
        value={query}
        aria-invalid={invalid}
        onChange={(e) => {
          setQuery(e.currentTarget.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          // closes the results rather than a dialog around them
          if (event.key === "Escape" && resultsOpen) {
            event.stopPropagation();
            setOpen(false);
          }
        }}
      />

      <PopoverContent
        anchor={inputRef}
        initialFocus={false}
        // the chosen item takes focus from the search it replaces
        finalFocus={false}
        className="w-(--anchor-width) overflow-hidden p-0"
      >
        {status === "pending" && enabled && (
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
            {data.map((item) => (
              <button
                key={getKey(item)}
                type="button"
                onClick={() => handleSelect(item)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                  "hover:bg-accent focus:bg-accent focus:outline-none",
                )}
              >
                <ItemLabel
                  initial={getInitial(item)}
                  label={getLabel(item)}
                  sublabel={getSublabel?.(item) ?? null}
                />
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

type ItemLabelProps = {
  initial: string;
  label: string;
  sublabel: string | null;
  className?: string;
};

function ItemLabel({ initial, label, sublabel, className }: ItemLabelProps) {
  return (
    <>
      <Avatar className="size-8">
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-sm", className)}>{label}</span>
        {sublabel !== null && (
          <span className="truncate text-xs text-muted-foreground">
            {sublabel}
          </span>
        )}
      </div>
    </>
  );
}
