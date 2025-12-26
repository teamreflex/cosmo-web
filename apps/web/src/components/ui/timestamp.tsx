import { useEffect, useState } from "react";
import { format as formatDate } from "date-fns";
import { Skeleton } from "./skeleton";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = PropsWithClassName<{
  date: Date;
  format: string;
}>;

export function Timestamp({ date, format, className }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton className="h-4 w-20 rounded-full" />;
  }

  return (
    <time dateTime={date.toISOString()} className={cn(className)}>
      {formatDate(date, format)}
    </time>
  );
}
