import type { PropsWithChildren } from "react";

export default function FiltersContainer({ children }: PropsWithChildren) {
  return (
    <div className="flex flex-col gap-2 border-b border-border bg-muted/40">
      <div className="container flex flex-col gap-2 py-2">{children}</div>
    </div>
  );
}
