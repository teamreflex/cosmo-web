import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type CellProps = {
  label: string;
  value: ReactNode;
  mono?: boolean;
  className?: string;
};

export function AttrCell({ label, value, mono, className }: CellProps) {
  return (
    <div
      className={cn(
        "flex h-14 flex-col justify-center border-r border-b border-border px-4 last:border-r-0 [&:nth-child(3n)]:border-r-0",
        className,
      )}
    >
      <span className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold",
          mono && "font-mono tabular-nums",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function StatCell({ label, value, mono, className }: CellProps) {
  return (
    <div
      className={cn(
        "flex h-14 flex-1 flex-col justify-center border-r border-border px-4 last:border-r-0",
        className,
      )}
    >
      <div className="text-xxs font-medium tracking-widest text-muted-foreground uppercase">
        {label}
      </div>
      <span className={cn("font-semibold", mono && "font-mono tabular-nums")}>
        {value}
      </span>
    </div>
  );
}
