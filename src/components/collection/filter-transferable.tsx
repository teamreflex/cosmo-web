import { Toggle } from "@/components/ui/toggle";
import { PropsWithFilters } from "@/hooks/use-cosmo-filters";

type Props = PropsWithFilters<"transferable">;

export default function TransferableFilter({ filters, setFilters }: Props) {
  return (
    <Toggle
      className="data-[state=on]:border-cosmo"
      variant="outline"
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
}
