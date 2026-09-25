import { Input } from "@/components/ui/input";
import { m } from "@/i18n/messages";
import { fullHexColour } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { useState } from "react";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"input">, "value" | "onChange"> & {
  value: string | undefined;
  onChange: (value: string) => void;
  /** swatches offered before the custom colour, when there are any */
  presets?: string[];
};

/**
 * A binder's spine colour: optional preset swatches, then a native colour
 * picker beside a hex text input. The remaining props go to the hex input, so
 * a form field's ref, name and blur land on it.
 */
export default function BinderColourInput({
  value = "",
  onChange,
  presets = [],
  ...props
}: Props) {
  // the picker only takes full hexes, so a half-typed one keeps the last colour
  const [pickerValue, setPickerValue] = useState(
    fullHexColour(value) ?? "#000000",
  );
  const typed = fullHexColour(value);
  if (typed !== null && typed !== pickerValue) setPickerValue(typed);

  return (
    <>
      {presets.length > 0 && (
        <div
          role="group"
          aria-label={m.binder_editor_colour_presets()}
          className="flex flex-wrap gap-2"
        >
          {presets.map((colour) => (
            <Swatch
              key={colour}
              colour={colour}
              selected={value.toLowerCase() === colour}
              onSelect={() => onChange(colour)}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={m.binder_editor_colour_custom()}
          value={pickerValue}
          onChange={(event) => onChange(event.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-sm border border-border bg-transparent p-0.5"
        />
        <Input
          aria-label={m.binder_editor_colour_hex()}
          maxLength={7}
          spellCheck={false}
          className="font-mono"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          {...props}
        />
      </div>
    </>
  );
}

type SwatchProps = {
  colour: string;
  selected: boolean;
  onSelect: () => void;
};

function Swatch({ colour, selected, onSelect }: SwatchProps) {
  return (
    <button
      type="button"
      aria-label={colour}
      aria-pressed={selected}
      title={colour}
      onClick={onSelect}
      style={{ backgroundColor: colour }}
      className={cn(
        "grid size-8 place-items-center rounded-full ring-1 ring-white/15 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cosmo-text",
        selected &&
          "ring-2 ring-foreground ring-offset-2 ring-offset-background",
      )}
    >
      {selected && <IconCheck className="size-4 text-white drop-shadow" />}
    </button>
  );
}
