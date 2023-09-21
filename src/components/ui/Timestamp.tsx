import { format } from "date-fns";

export default function Timestamp({ timestamp }: { timestamp: string }) {
  const formatted = format(Date.parse(timestamp), "MMM d");

  return <time dateTime={timestamp}>{formatted}</time>;
}
