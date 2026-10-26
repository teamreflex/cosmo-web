import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { Radio } from "@base-ui/react/radio";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { RadioGroup } from "../ui/radio-group";

const stars = [1, 2, 3, 4, 5] as const;

type Props = {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
};

/**
 * An optional 1 to 5 star rating as a radio group, so the arrow keys move
 * it. Picking the chosen star again clears it.
 */
export default function StarRating({
  label,
  value,
  onChange,
  disabled,
}: Props) {
  return (
    <RadioGroup<number | null>
      aria-label={label}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      className="flex w-fit gap-0.5"
    >
      {stars.map((star) => (
        <Radio.Root
          key={star}
          value={star}
          aria-label={m.feedback_star({ count: star })}
          onClick={() => {
            if (value === star) onChange(null);
          }}
          className={cn(
            "inline-flex size-9 cursor-pointer items-center justify-center rounded-sm border border-transparent outline-none hover:bg-muted focus-visible:border-cosmo/60 max-md:size-10 data-disabled:cursor-default data-disabled:opacity-50 [&_svg]:size-5",
            value !== null && star <= value
              ? "text-amber-700 dark:text-amber-500"
              : "text-muted-foreground/50",
          )}
        >
          {value !== null && star <= value ? <IconStarFilled /> : <IconStar />}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}

/**
 * A star rating as text reads it, "Speed: 4 of 5", drawn as five small
 * stars.
 */
function StarScore({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={m.feedback_stars_read({ label, count: value })}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span aria-hidden>{label}</span>
      <span aria-hidden className="inline-flex [&_svg]:size-3">
        {stars.map((star) =>
          star <= value ? (
            <IconStarFilled
              key={star}
              className="text-amber-700 dark:text-amber-500"
            />
          ) : (
            <IconStar key={star} className="text-muted-foreground/50" />
          ),
        )}
      </span>
    </span>
  );
}

/**
 * A rating's optional communication and speed stars, or nothing when it has
 * neither.
 */
export function FeedbackStars({
  communication,
  speed,
}: {
  communication: number | null;
  speed: number | null;
}) {
  if (communication === null && speed === null) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {communication !== null && (
        <StarScore label={m.feedback_communication()} value={communication} />
      )}
      {speed !== null && <StarScore label={m.feedback_speed()} value={speed} />}
    </div>
  );
}
