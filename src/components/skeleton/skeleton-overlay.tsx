import type { PropsWithClassName } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Props = PropsWithClassName<{}>;

export default function SkeletonGradient({ className }: Props) {
  return (
    <div
      className={cn(
        "absolute top-0 z-20 h-full w-full bg-linear-to-b from-transparent to-background to-75%",
        className,
      )}
    />
  );
}
