import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

export default function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-accent", className)}
      {...props}
    />
  );
}
