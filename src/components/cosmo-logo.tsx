import { cn } from "@/lib/utils";
import Image from "next/image";

type Props = {
  className?: string;
  height?: number;
  width?: number;
  color?: "white" | "black";
};

export default function CosmoLogo({
  className,
  height = 35,
  width = 35,
  color = "white",
}: Props) {
  return (
    <Image
      src="/cosmo.png"
      height={height}
      width={width}
      alt="Cosmo"
      className={cn(className, color === "black" && "invert")}
    />
  );
}
