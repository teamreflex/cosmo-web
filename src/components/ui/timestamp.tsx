import { cn, PropsWithClassName } from "@/lib/utils";
import { format } from "date-fns";

type Props = PropsWithClassName<{
  timestamp: string;
}>;

export default function Timestamp({ timestamp, className }: Props) {
  const formatted = format(Date.parse(timestamp), "MMM d");

  return (
    <time dateTime={timestamp} className={cn(className)}>
      {formatted}
    </time>
  );
}
