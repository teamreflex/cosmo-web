import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format as formatDate } from "date-fns";
import { useEffect, useState } from "react";
import { Skeleton } from "./skeleton";

type Props = PropsWithClassName<{
  date: Date;
  format: string;
  showTime?: boolean;
}>;

export function Timestamp({ date, format, className, showTime }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton className="h-4 w-20 rounded-full" />;
  }

  const displayFormat = showTime ? `${format} h:mm a` : format;

  return (
    <time dateTime={date.toISOString()} className={cn(className)}>
      {formatDate(date, displayFormat)}
    </time>
  );
}
