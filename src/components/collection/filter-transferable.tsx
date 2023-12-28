"use client";

import { Toggle } from "@/components/ui/toggle";
import { PropsWithFilters } from "./collection-renderer";
import { memo } from "react";

type Props = PropsWithFilters<"transferable">;

export default memo(function TransferableFilter({
  filters,
  setFilters,
}: Props) {
  return (
    <Toggle
      className="drop-shadow-lg"
      variant="cosmo"
      pressed={filters ?? false}
      onPressedChange={(v) => setFilters("transferable", v ? true : null)}
      aria-label="Toggle transferable"
    >
      Transferable
    </Toggle>
  );
});
