import { PropsWithClassName, cn } from "@/lib/utils";

export default function Skeleton({ className }: PropsWithClassName<{}>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-accent shrink-0", className)}
    />
  );
}
