import { PropsWithClassName, cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Image from "next/image";
import { CSSProperties } from "react";
import { useElementSize } from "usehooks-ts";

type Props = PropsWithClassName<{
  image: string;
  collectionNo: string;
  objektNo: number;
  textColor: string;
  selected: boolean;
}>;

export default function GridObjekt({
  className,
  image,
  collectionNo,
  objektNo,
  textColor,
  selected,
}: Props) {
  const css = {
    "--objekt-text-color": textColor,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "relative aspect-photocard rounded-lg bg-accent w-full flex justify-center items-center border-4 border-transparent transition-colors",
        `text-[var(--objekt-text-color)]`,
        selected && "rounded-2xl border-cosmo",
        className
      )}
      style={css}
    >
      <Image src={image} fill={true} alt={collectionNo} />
      <GridObjektNumber collectionNo={collectionNo} objektNo={objektNo} />
      <div
        className={cn(
          "absolute top-1 left-1 bg-cosmo text-white rounded-full p-1 transition-all opacity-0",
          selected && "opacity-100"
        )}
      >
        <Check className="w-4 h-4" />
      </div>
    </div>
  );
}

function GridObjektNumber({
  collectionNo,
  objektNo,
}: {
  collectionNo: string;
  objektNo: number;
}) {
  const [ref, { width }] = useElementSize();

  return (
    <div
      ref={ref}
      className="absolute h-full items-center w-[11%] flex gap-2 justify-center top-0 right-0 [writing-mode:vertical-lr] font-semibold text-[var(--objekt-text-color)]"
      style={{ lineHeight: `${width}px`, fontSize: `${width * 0.55}px` }}
    >
      <span>{collectionNo}</span>
      <span>#{objektNo.toString().padStart(5, "0")}</span>
    </div>
  );
}
