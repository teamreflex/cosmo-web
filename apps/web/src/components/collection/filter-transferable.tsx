import { Toggle } from "@/components/ui/toggle";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { m } from "@/i18n/messages";

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
      aria-label={m.filter_toggle_transferable()}
    >
      {m.filter_transferable_label()}
    </Toggle>
  );
}
