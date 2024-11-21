"use client";

import { Toggle } from "@/components/ui/toggle";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";
import { memo } from "react";

type Props = PropsWithFilters<"transferable">;

export default memo(function TransferableFilter({
  filters,
  setFilters,
}: Props) {
  return (
    <Toggle
      variant="cosmo"
      pressed={filters ?? false}
      onPressedChange={(v) =>
        setFilters({
          transferable: v ? true : null,
        })
      }
      aria-label="Toggle transferable"
    >
      Transferable
    </Toggle>
  );
});
