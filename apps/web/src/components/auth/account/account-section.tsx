import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

/**
 * One card on the account page. Its `id` is the anchor the page's section
 * menu links to.
 */
export function AccountSection({
  id,
  title,
  description,
  className,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "scroll-mt-20 rounded-xl border border-border bg-card",
        className,
      )}
    >
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <h2 id={`${id}-title`} className="font-semibold">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

type RowProps = {
  label: ReactNode;
  description?: string;
  children: ReactNode;
};

/**
 * A setting inside a section: its label on the left, the control on the
 * right, stacked on narrow screens.
 */
export function AccountRow({ label, description, children }: RowProps) {
  return (
    <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:gap-6 sm:px-6">
      <div className="flex flex-col items-start gap-1.5 sm:w-48 sm:shrink-0">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
