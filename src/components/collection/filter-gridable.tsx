"use client";

import { Toggle } from "@/components/ui/toggle";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { memo } from "react";

type Props = PropsWithFilters<"gridable">;

export default memo(function GridableFilter({ filters, setFilters }: Props) {
  return (
    <Toggle
      variant="cosmo"
      pressed={filters ?? false}
      onPressedChange={(v) => setFilters("gridable", v ? true : null)}
      aria-label="Toggle gridable"
    >
      Gridable
    </Toggle>
  );
});
