import { m } from "@/i18n/messages";
import { cn, type PropsWithClassName } from "@/lib/utils";

/**
 * A COMO figure: the number carries the weight, the unit reads as a label.
 */
export function ComoAmount({ como, className }: PropsWithClassName<Amount>) {
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <span className="font-bold">{como.toLocaleString()}</span>
      <span className="text-muted-foreground">{m.common_como()}</span>
    </span>
  );
}

type Amount = {
  como: number;
};

type Props = {
  como: number;
  /** Fraction of the poll total. */
  share: number;
};

/**
 * COMO taken and what share of the poll it is.
 */
export default function ComoShare(props: Props) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <ComoAmount como={props.como} />
      <span className="text-muted-foreground">
        ({(props.share * 100).toFixed(1)}%)
      </span>
    </span>
  );
}
