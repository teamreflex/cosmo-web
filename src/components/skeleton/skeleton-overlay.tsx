import { cn, type PropsWithClassName } from "@/lib/utils";

type Props = PropsWithClassName<{}>;

export default function SkeletonGradient({ className }: Props) {
  return (
    <div
      className={cn(
        "z-20 absolute top-0 w-full h-full bg-linear-to-b from-transparent to-75% to-background",
        className
      )}
    />
  );
}
