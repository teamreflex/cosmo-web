import { cn, type PropsWithClassName } from "@/lib/utils";
import type { PropsWithChildren, ReactNode } from "react";

type Props = PropsWithChildren<
  PropsWithClassName<{
    title: ReactNode;
  }>
>;

export default function FilterHeader(props: Props) {
  return (
    <div className="border-b border-border">
      <div
        className={cn(
          "container relative flex h-14 items-center gap-3",
          props.className,
        )}
      >
        <h1 className="flex items-center gap-2 font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
          {props.title}
        </h1>
        {props.children}
      </div>
    </div>
  );
}
