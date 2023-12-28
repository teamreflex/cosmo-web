"use client";

import { memo, useContext } from "react";
import { ObjektContext, isOwnedObjekt } from "./context";
import { IndexedObjekt } from "@/lib/universal/objekts";
import { OwnedObjekt } from "@/lib/universal/cosmo/objekts";
import { useElementSize } from "@/hooks/use-element-size";

export default memo(function ObjektSidebar() {
  const { objekt } = useContext(ObjektContext) as ObjektContext<
    OwnedObjekt | IndexedObjekt
  >;
  const [ref, { width }] = useElementSize();

  // have to run ownership check due to ambiguous typing
  const serial = isOwnedObjekt(objekt) ? objekt.objektNo : undefined;

  /**
   * sometimes the first element in the grid is a couple pixels smaller on the width, resulting in an offset number, not sure why.
   * using line-height works around it, as the background container is transparent so there's no resulting overflow.
   * sometimes the actual objekt image has a larger border by a few px (~12% width), this cannot account for that.
   */
  return (
    <div
      ref={ref}
      className="absolute h-full items-center w-[11%] flex gap-2 justify-center top-0 right-0 [writing-mode:vertical-lr] font-semibold text-[var(--objekt-text-color)] select-none"
      style={{
        lineHeight: `${width}px`,
        fontSize: `${width * 0.55}px`,
      }}
    >
      <span>{objekt.collectionNo}</span>
      {serial && <span>#{serial.toString().padStart(5, "0")}</span>}
    </div>
  );
});
