import { PropsWithClassName, cn, pad } from "@/lib/utils";
import Image from "next/image";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useElementSize } from "usehooks-ts";

type Props = PropsWithClassName<{
  image: string;
  collectionNo: string;
  objektNo: number;
  textColor: string;
}>;

export default function GridObjekt({
  className,
  image,
  collectionNo,
  objektNo,
  textColor,
}: Props) {
  const css = {
    "--objekt-text-color": textColor,
  } as CSSProperties;

  return (
    <div
      className={cn(
        "relative aspect-photocard rounded-lg bg-accent w-full flex justify-center items-center",
        `text-[var(--objekt-text-color)]`,
        className
      )}
      style={css}
    >
      <Image src={image} fill={true} alt={collectionNo} />
      <GridObjektNumber collectionNo={collectionNo} objektNo={objektNo} />
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
      <span>#{pad(objektNo.toString())}</span>
    </div>
  );
}
