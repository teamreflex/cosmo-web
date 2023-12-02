"use client";

import { useContext } from "react";
import { useElementSize } from "usehooks-ts";
import { ObjektContext, isOwnedObjekt } from "./util";
import { IndexedObjekt } from "@/lib/universal/objekts";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";

export default function ObjektSidebar() {
  const { objekt } = useContext(ObjektContext) as ObjektContext<
    OwnedObjekt | IndexedObjekt
  >;
  const [ref, { width }] = useElementSize();

  // have to run ownership check due to ambiguous typing
  const serial = isOwnedObjekt(objekt) ? objekt.objektNo : undefined;

  // sometimes the first element in the grid is a couple pixels smaller on the width, resulting in an offset number
  // using line-height works around it, as the background container is transparent so there's no resulting overflow
  return (
    <div
      ref={ref}
      className="absolute h-full items-center w-[11%] flex gap-2 justify-center top-0 right-0 [writing-mode:vertical-lr] font-semibold text-[var(--objekt-text-color)] select-none"
      style={{ lineHeight: `${width}px`, fontSize: `${width * 0.55}px` }}
    >
      <span>{objekt.collectionNo}</span>
      {serial && <span>#{serial.toString().padStart(5, "0")}</span>}
    </div>
  );
}
