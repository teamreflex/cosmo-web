"use client";

import { Toggle } from "@/components/ui/toggle";
import { PropsWithFilters } from "./collection-renderer";

type Props = PropsWithFilters<"transferable">;

export function TransferableFilter({ filters, setFilters }: Props) {
  return (
    <Toggle
      variant="cosmo"
      pressed={filters}
      onPressedChange={setFilters}
      aria-label="Toggle transferable"
    >
      Transferable
    </Toggle>
  );
}
