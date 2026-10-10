import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

const statusPillVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-xxs tracking-widest uppercase",
  {
    variants: {
      tone: {
        accent: "bg-cosmo/30 text-cosmo-text",
        fg: "bg-foreground/10 text-foreground",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "accent",
    },
  },
);

type Props = VariantProps<typeof statusPillVariants> & {
  children: ReactNode;
  glyph?: ReactNode;
  className?: string;
};

export default function StatusPill({
  tone,
  children,
  glyph,
  className,
}: Props) {
  return (
    <span className={cn(statusPillVariants({ tone }), className)}>
      {glyph}
      {children}
    </span>
  );
}
