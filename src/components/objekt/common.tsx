import { NonTransferableReason } from "@/lib/universal/cosmo/objekts";
import { useElementSize } from "@/hooks/use-element-size";

type ObjektSidebarProps = {
  collection: string;
  serial?: number;
};

export function ObjektSidebar({ collection, serial }: ObjektSidebarProps) {
  const [ref, { width }] = useElementSize();

  const paddedSerial =
    serial === 0 ? "00000" : serial?.toString().padStart(5, "0");

  /**
   * sometimes the first element in the grid is a couple pixels smaller on the width, resulting in an offset number, not sure why.
   * using line-height works around it, as the background container is transparent so there's no resulting overflow.
   * sometimes the actual objekt image has a larger border by a few px (~12% width), this cannot account for that.
   */
  return (
    <div
      ref={ref}
      className="absolute h-full items-center w-[11%] flex gap-2 justify-center top-0 right-0 [writing-mode:vertical-lr] font-semibold text-(--objekt-text-color) select-none"
      style={{
        lineHeight: `${width}px`,
        fontSize: `${width * 0.55}px`,
      }}
    >
      <span>{collection}</span>
      {paddedSerial && <span>#{paddedSerial}</span>}
    </div>
  );
}

export type Hoverable =
  | "send"
  | "lock"
  | "locked"
  | "list"
  | "pin"
  | "pinned"
  | NonTransferableReason;

/**
 * Replaces the 4x or original suffix from an image URL.
 */
export function replaceUrlSize(url: string, size: "2x" | "thumbnail" = "2x") {
  return url.replace(/4x|original$/i, size);
}

/**
 * Replaces the 4x suffix from both image URLs.
 */
export function getObjektImageUrls(opts: {
  frontImage: string;
  backImage: string;
}) {
  const front = replaceUrlSize(opts.frontImage);
  const back = replaceUrlSize(opts.backImage);

  return {
    front: {
      display: front,
      download: opts.frontImage,
    },
    back: {
      display: back,
      download: opts.backImage,
    },
  };
}
