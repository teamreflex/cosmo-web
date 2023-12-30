"use client";

import { memo } from "react";
import { useElementSize } from "@/hooks/use-element-size";

type Props = {
  collection: string;
  serial?: number;
};

export default memo(function ObjektSidebar({ collection, serial }: Props) {
  const [ref, { width }] = useElementSize();

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
      <span>{collection}</span>
      {serial && <span>#{serial.toString().padStart(5, "0")}</span>}
    </div>
  );
});
