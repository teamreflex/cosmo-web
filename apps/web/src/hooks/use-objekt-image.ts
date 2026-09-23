import {
  getObjektFrontImageRef,
  getObjektFrontImageUrl,
} from "@/lib/client/objekt-util";
import { env } from "@/lib/env/client";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { objektImageSrcSet } from "@apollo/image";
import { createContext, use } from "react";

/**
 * Rendered width in CSS pixels of the grid cell an objekt image sits in, when
 * the surrounding grid knows it.
 */
export const ObjektCellWidthContext = createContext<number | null>(null);

/**
 * `src`/`srcSet`/`sizes` for a grid cell's front image, to spread onto an
 * `<img>`. Inside a grid that provides its cell width, the browser gets an
 * exact `sizes` so `srcset` picks the smallest rendition that stays sharp;
 * elsewhere the 600px thumbnail covers the small grids objekts appear in.
 */
export function useObjektImage(
  collection: Pick<
    Objekt.Collection,
    "slug" | "frontImage" | "frontImageVersion"
  >,
) {
  const cellWidth = use(ObjektCellWidthContext);
  const ref = getObjektFrontImageRef(collection);
  const responsive = ref !== null && cellWidth !== null;

  return {
    src: getObjektFrontImageUrl(collection, "thumbnail"),
    srcSet: responsive
      ? objektImageSrcSet(env.VITE_CDN_URL, ref, ["thumbnail", "grid"])
      : undefined,
    sizes: responsive ? `${cellWidth}px` : undefined,
  };
}
