import { m } from "@/i18n/messages";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useId } from "react";
import { Button } from "../ui/button";

type Props = {
  value: number;
  canDecrement: boolean;
  canIncrement: boolean;
  onStep: (delta: number) => void;
};

/**
 * How many objekts a want row asks for, between two buttons. The caps
 * disable the buttons rather than the number moving past them.
 */
export default function ComposerStepper({
  value,
  canDecrement,
  canIncrement,
  onStep,
}: Props) {
  const labelId = useId();

  return (
    <span
      role="group"
      aria-labelledby={labelId}
      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-sm border border-border px-1 max-md:h-10"
    >
      <span id={labelId} className="sr-only">
        {m.listing_composer_count()}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={m.listing_composer_fewer()}
        disabled={!canDecrement}
        onClick={() => onStep(-1)}
        className="text-muted-foreground max-md:size-8"
      >
        <IconMinus />
      </Button>
      <output
        aria-live="polite"
        className="min-w-4 text-center font-mono text-sm font-bold tabular-nums"
      >
        {value}
      </output>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={m.listing_composer_more()}
        disabled={!canIncrement}
        onClick={() => onStep(1)}
        className="text-muted-foreground max-md:size-8"
      >
        <IconPlus />
      </Button>
    </span>
  );
}
