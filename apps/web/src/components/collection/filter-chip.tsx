import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";

type Props = {
  label: string;
  valueLabel?: string;
  count?: number;
  active?: boolean;
  width?: number;
  align?: "start" | "center" | "end";
  children: ReactNode | ((state: { close: () => void }) => ReactNode);
};

export default function FilterChip({
  label,
  valueLabel,
  count,
  active,
  width = 240,
  align = "start",
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-sm border bg-transparent px-2.5 text-xs font-medium transition-colors hover:bg-accent",
            active
              ? "border-cosmo/80 bg-cosmo/10 text-foreground"
              : "border-border text-foreground",
          )}
          data-active={active || undefined}
        >
          <span>{label}</span>
          {valueLabel && (
            <span
              className={cn(
                "-my-1 flex items-center gap-1.5 border-l pl-2 font-mono text-[11px]",
                active
                  ? "border-cosmo/40 text-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              <span>{valueLabel}</span>
              {count !== undefined && count > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-sm bg-cosmo px-1 text-xxs font-bold text-white tabular-nums">
                  {count}
                </span>
              )}
            </span>
          )}
          <IconChevronDown
            className={cn(
              "size-3 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="rounded-sm p-0"
        style={{ width }}
      >
        {typeof children === "function"
          ? children({ close: () => setOpen(false) })
          : children}
      </PopoverContent>
    </Popover>
  );
}
