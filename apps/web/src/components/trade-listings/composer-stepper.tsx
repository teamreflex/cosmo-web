import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { useId } from "react";
import { Button } from "../ui/button";

type Props = {
  value: number;
  canDecrement: boolean;
  canIncrement: boolean;
  onStep: (delta: number) => void;
  /** "lg" is the Ratio control's, whose number is the strip's headline */
  size?: keyof typeof sizes;
  /** what the group and its buttons are called, a want row's count when left out */
  labels?: { group: string; fewer: string; more: string };
  className?: string;
  valueClassName?: string;
};

const sizes = {
  sm: {
    group: "h-9 rounded-sm px-1 max-md:h-10",
    button: "icon-xs",
    buttonClassName: "text-muted-foreground max-md:size-8",
    value: "min-w-4 text-sm",
  },
  lg: {
    group: "rounded-md bg-background p-0.5",
    button: "icon",
    buttonClassName: "touch-manipulation max-md:size-11",
    value: "min-w-9 text-2xl",
  },
} as const;

/**
 * A number between two buttons: how many objekts a want row asks for, or
 * the poster's side of the ratio. The caps disable the buttons rather than
 * the number moving past them.
 */
export default function ComposerStepper({
  value,
  canDecrement,
  canIncrement,
  onStep,
  size = "sm",
  labels,
  className,
  valueClassName,
}: Props) {
  const labelId = useId();
  const variant = sizes[size];

  return (
    <span
      role="group"
      aria-labelledby={labelId}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 border border-border",
        variant.group,
        className,
      )}
    >
      <span id={labelId} className="sr-only">
        {labels?.group ?? m.listing_composer_count()}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={variant.button}
        aria-label={labels?.fewer ?? m.listing_composer_fewer()}
        disabled={!canDecrement}
        onClick={() => onStep(-1)}
        className={variant.buttonClassName}
      >
        <IconMinus />
      </Button>
      <output
        aria-live="polite"
        className={cn(
          "text-center font-mono font-bold tabular-nums",
          variant.value,
          valueClassName,
        )}
      >
        {value}
      </output>
      <Button
        type="button"
        variant="ghost"
        size={variant.button}
        aria-label={labels?.more ?? m.listing_composer_more()}
        disabled={!canIncrement}
        onClick={() => onStep(1)}
        className={variant.buttonClassName}
      >
        <IconPlus />
      </Button>
    </span>
  );
}
