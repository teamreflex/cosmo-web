import type { ValidArtist } from "./types/common";

/**
 * idntt band image URLs don't appear to change by season so far, so they can be hardcoded.
 */
export const bands: Record<ValidArtist, Record<string, string>> = {
  idntt: {
    Special:
      "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/86207a80d354439cada0ec6c45e076ee20250814061643330.png",
    Unit: "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/e0e4fdd950bc4ca8ba49a98b053756f620250814065358420.png",
  },
  artms: {},
  tripleS: {},
};
