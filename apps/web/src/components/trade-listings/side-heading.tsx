import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Skeleton } from "../ui/skeleton";

type Props = {
  /** `have` for what the poster offers or the viewer gives, `want` for what the listing asks for or the viewer gets */
  tone: "have" | "want";
  title: ReactNode;
  summary?: ReactNode;
};

/**
 * Heads one half of the listing page: a coloured label over a 2px rule in
 * the same colour, with a short summary at the far end. The label stays on
 * one line; a summary too long to sit beside it wraps onto its own lines.
 */
export default function SideHeading({ tone, title, summary }: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b-2 pb-2.5",
        tone === "have" ? "border-teal-500/45" : "border-amber-500/45",
      )}
    >
      <Eyebrow tone={tone} className="whitespace-nowrap">
        {title}
      </Eyebrow>
      {summary !== undefined && (
        <span className="ms-auto min-w-0 text-xs text-muted-foreground">
          {summary}
        </span>
      )}
    </div>
  );
}

/**
 * A small uppercase label in its side's colour: teal for what's given,
 * amber for what's asked for or got.
 */
export function Eyebrow({
  tone,
  className,
  children,
}: {
  tone: "have" | "want";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-xxs font-medium tracking-widest uppercase",
        tone === "have"
          ? "text-teal-700 dark:text-teal-500"
          : "text-amber-700 dark:text-amber-500",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A side heading while the listing loads: bars one line of the label's and
 * the summary's text tall, so it's as tall as the heading it stands in for.
 */
export function SideHeadingSkeleton() {
  return (
    <div className="flex items-baseline gap-2 border-b-2 border-border pb-2.5">
      <Skeleton className="h-[1lh] w-24 text-xxs" />
      <Skeleton className="ms-auto h-[1lh] w-28 text-xs" />
    </div>
  );
}
