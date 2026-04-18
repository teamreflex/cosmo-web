import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Props = {
  title: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export default function FilterHeader({
  title,
  center,
  right,
  className,
}: Props) {
  return (
    <div className="border-b border-border">
      <div
        className={cn(
          "container grid grid-cols-[auto_1fr_auto] items-center gap-3 py-3",
          className,
        )}
      >
        <h1 className="flex items-center gap-2 font-cosmo text-2xl leading-none font-black tracking-wide uppercase md:text-3xl">
          {title}
        </h1>
        <div className="flex min-w-0 items-center justify-center">{center}</div>
        <div className="flex min-w-0 items-center justify-end gap-2 font-mono text-xs text-muted-foreground tabular-nums">
          <div id="objekt-total" className="hidden sm:block" />
          {right}
        </div>
      </div>
    </div>
  );
}
