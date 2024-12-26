import { NonTransferableReason } from "@/lib/universal/cosmo/objekts";
import { LegacyObjekt } from "@/lib/universal/objekts";
import { useElementSize } from "@/hooks/use-element-size";
import { PropsWithChildren } from "react";
import { Objekt } from "../../lib/universal/objekt-conversion";

export type CommonObjektProps = PropsWithChildren<{
  id: string | number;
  objekt: Objekt.Common;
  serial?: number;
}>;

type ObjektSidebarProps = {
  collection: string;
  serial?: number;
};

export function ObjektSidebar({ collection, serial }: ObjektSidebarProps) {
  const [ref, { width }] = useElementSize();

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
      {serial && <span>#{serial.toString().padStart(5, "0")}</span>}
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

const map: Record<string, string> = {
  artms: "ARTMS",
  triples: "tripleS",
};

/**
 * Parse a valid artist from an ambiguous objekt.
 */
export function getObjektArtist(objekt: LegacyObjekt) {
  if ("objektNo" in objekt) {
    return map[objekt.artists[0]!.toLowerCase()];
  }
  if ("id" in objekt) {
    return map[objekt.artist.toLowerCase()];
  }

  throw new Error("Invalid objekt");
}

/**
 * Parse a valid offline type from an ambiguous objekt.
 */
export function getObjektType(objekt: LegacyObjekt) {
  if ("objektNo" in objekt) {
    return objekt.collectionNo.at(-1) === "Z" ? "online" : "offline";
  }
  if ("id" in objekt) {
    return objekt.onOffline;
  }

  throw new Error("Invalid objekt");
}

/**
 * Replaces the 4x suffix from an image URL.
 */
export function replaceUrlSize(url: string, size: "2x" | "thumbnail" = "2x") {
  return url.replace(/4x$/i, size);
}

/**
 * Replaces the 4x suffix from both image URLs.
 */
export function getObjektImageUrls(objekt: Objekt.Common) {
  const front = replaceUrlSize(objekt.frontImage);
  const back = replaceUrlSize(objekt.backImage);

  return {
    front: {
      display: front,
      download: objekt.frontImage,
    },
    back: {
      display: back,
      download: objekt.backImage,
    },
  };
}
