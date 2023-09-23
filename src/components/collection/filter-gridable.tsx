"use client";

import { Toggle } from "@/components/ui/toggle";
import { PropsWithFilters } from "./collection-renderer";

type Props = PropsWithFilters<"gridable">;

export function GridableFilter({ filters, setFilters }: Props) {
  return (
    <Toggle
      variant="cosmo"
      pressed={filters}
      onPressedChange={setFilters}
      aria-label="Toggle gridable"
    >
      Gridable
    </Toggle>
  );
}
