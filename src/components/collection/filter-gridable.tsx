"use client";

import { Toggle } from "@/components/ui/toggle";
import { PropsWithFilters } from "./collection-renderer";

type Props = PropsWithFilters<"gridable">;

export function GridableFilter({ filters, setFilters }: Props) {
  return (
    <Toggle
      className="drop-shadow-lg"
      variant="cosmo"
      pressed={filters ?? false}
      onPressedChange={(v) => setFilters(v ? true : null)}
      aria-label="Toggle gridable"
    >
      Gridable
    </Toggle>
  );
}
