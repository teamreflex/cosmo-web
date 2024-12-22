import { PropsWithClassName, cn } from "@/lib/utils";
import { PropsWithChildren } from "react";
import { TbLoader2 } from "react-icons/tb";

type Props = PropsWithClassName<PropsWithChildren>;

export function Loader({ children, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center w-full gap-2 py-12",
        className
      )}
    >
      <TbLoader2 className="animate-spin w-24 h-24" />
      <p className="font-semibold text-sm text-center">{children}</p>
    </div>
  );
}
