import { cn, type PropsWithClassName } from "@/lib/utils";
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";

type Props = PropsWithClassName<{
  date: Date;
}>;

export default function GravityTimestamp({ date, className }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton className="w-20 h-4 rounded-full" />;
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
