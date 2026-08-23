import { m } from "@/i18n/messages";

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
    <span className="font-mono">
      {props.como.toLocaleString()} {m.common_como()} (
      {(props.share * 100).toFixed(1)}%)
    </span>
  );
}
