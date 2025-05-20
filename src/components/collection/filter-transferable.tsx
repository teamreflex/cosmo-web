import { Toggle } from "@/components/ui/toggle";
import type { PropsWithFilters } from "@/hooks/use-cosmo-filters";

export default function TransferableFilter({
  filters,
  setFilters,
}: PropsWithFilters) {
  const pressed = filters?.transferable ?? false;

  return (
    <Toggle
      className="data-[state=on]:border-cosmo"
      variant="outline"
      pressed={pressed}
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
}
