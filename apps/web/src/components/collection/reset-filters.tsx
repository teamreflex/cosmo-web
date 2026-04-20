import { m } from "@/i18n/messages";
import { IconX } from "@tabler/icons-react";

type Props = {
  count: number;
  onReset: () => void;
};

export default function ResetFilters({ count, onReset }: Props) {
  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onReset}
      aria-label={m.aria_reset_filters()}
      className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground"
    >
      <IconX className="size-3" />
      <span>{m.filter_reset()}</span>
      <span className="font-mono text-xxs">({count})</span>
    </button>
  );
}
