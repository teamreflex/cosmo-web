import { PropsWithClassName, cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { PropsWithChildren } from "react";

type Props = PropsWithClassName<PropsWithChildren>;

export function Loader({ children, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center items-center w-full gap-2 py-12",
        className
      )}
    >
      <Loader2 className="animate-spin w-24 h-24" />
      <p className="font-semibold text-sm text-center">{children}</p>
    </div>
  );
}
