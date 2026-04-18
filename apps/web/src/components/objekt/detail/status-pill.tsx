import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type Tone = "accent" | "fg" | "muted";

type Props = {
  tone: Tone;
  children: ReactNode;
  glyph?: ReactNode;
};

export default function StatusPill({ tone, children, glyph }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px] tracking-[0.1em] uppercase",
        tone === "accent" && "bg-cosmo/20 text-cosmo",
        tone === "fg" && "bg-foreground/10 text-foreground",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {glyph}
      {children}
    </span>
  );
}
