import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = PropsWithClassName<{
  date: Date;
}>;

export default function GravityTimestamp({ date, className }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton className="h-4 w-20 rounded-full" />;
  }

  const iso = date.toISOString();
  const formatted = date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  return (
    <time dateTime={iso} className={cn(className)}>
      {formatted}
    </time>
  );
}
