import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { Toggle } from "@/components/ui/toggle";

type Props = {
  transferable: CosmoFilters["transferable"];
  onChange: SetCosmoFilters;
};

export default function TransferableFilter(props: Props) {
  const pressed = props.transferable ?? false;

  function handleChange(value: boolean) {
    props.onChange({
      transferable: value ? true : undefined,
    });
  }

  return (
    <Toggle
      className="data-[state=on]:border-cosmo"
      variant="outline"
      pressed={pressed}
      onPressedChange={handleChange}
      aria-label="Toggle transferable"
    >
      Transferable
    </Toggle>
  );
}
