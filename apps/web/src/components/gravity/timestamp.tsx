import { useHydrated } from "@/hooks/use-hydrated";
import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

type Props = PropsWithClassName<{
  date: Date;
}>;

export default function GravityTimestamp({ date, className }: Props) {
  // defer to client render to avoid hydration mismatch from timezone differences
  const hydrated = useHydrated();
  if (!hydrated) {
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
