import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  filterChipClassName,
  filterChipValueClassName,
} from "./filter-chip-styles";

type Props = {
  label: string;
  valueLabel?: string;
  /** shown before the value, such as an artist's logo */
  valueIcon?: ReactNode;
  count?: number;
  active?: boolean;
  width?: number;
  align?: "start" | "center" | "end";
  children: ReactNode | ((state: { close: () => void }) => ReactNode);
};

export default function FilterChip({
  label,
  valueLabel,
  valueIcon,
  count,
  active,
  width = 240,
  align = "start",
  children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={filterChipClassName(active)}
        data-active={active || undefined}
      >
        <span>{label}</span>
        {valueLabel && (
          <span className={filterChipValueClassName(active)}>
            {valueIcon}
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
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="max-w-(--available-width) rounded-sm p-0"
        style={{ width }}
      >
        {/* oxlint-disable-next-line anti-slop/no-runtime-typeof -- narrowing the render-prop union */}
        {typeof children === "function"
          ? children({ close: () => setOpen(false) })
          : children}
      </PopoverContent>
    </Popover>
  );
}
