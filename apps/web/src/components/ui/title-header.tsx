import { cn, type PropsWithClassName } from "@/lib/utils";
import type { PropsWithChildren, ReactNode } from "react";

type Props = PropsWithChildren<
  PropsWithClassName<{
    title: ReactNode;
    /**
     * Sits beside the title, or under it on phones.
     */
    total?: ReactNode;
  }>
>;

export default function TitleHeader(props: Props) {
  return (
    <div className="border-b border-border">
      <div
        className={cn(
          "relative container flex h-14 items-center gap-3",
          props.className,
        )}
      >
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-3">
          <h1 className="flex items-center gap-2 font-cosmo text-xl leading-none font-black tracking-wide uppercase md:text-2xl">
            {props.title}
          </h1>
          {props.total}
        </div>
        {props.children}
      </div>
    </div>
  );
}
