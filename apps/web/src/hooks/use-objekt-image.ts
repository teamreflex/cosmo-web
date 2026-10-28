import {
  getObjektFrontImageRef,
  getObjektFrontImageUrl,
} from "@/lib/client/objekt-util";
import { env } from "@/lib/env/client";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { objektImageSrcSet } from "@apollo/image";
import { createContext, use } from "react";

/**
 * `sizes` describing the cell an objekt image sits in, when the surrounding
 * grid knows its layout.
 */
export const ObjektImageSizesContext = createContext<string | null>(null);

/**
 * `src`/`srcSet`/`sizes` for a grid cell's front image, to spread onto an
 * `<img>`. Inside a grid that provides its `sizes`, `srcset` picks the
 * smallest rendition that stays sharp; elsewhere the 600px thumbnail covers
 * the small grids objekts appear in.
 */
export function useObjektImage(
  collection: Pick<
    Objekt.Collection,
    "slug" | "frontImage" | "frontImageVersion"
  >,
) {
  const sizes = use(ObjektImageSizesContext);
  const ref = getObjektFrontImageRef(collection);
  const responsive = ref !== null && sizes !== null;

  return {
    src: getObjektFrontImageUrl(collection, "thumbnail"),
    srcSet: responsive
      ? objektImageSrcSet(env.VITE_CDN_URL, ref, ["xs", "thumbnail", "grid"])
      : undefined,
    sizes: responsive ? sizes : undefined,
  };
}
