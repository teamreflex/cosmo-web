import type { Collection } from "@/lib/server/db/indexer/schema";
import { ObjektMetadataEntry, Profile } from "@/lib/server/db/schema";
export type {
  ObjektList,
  CreateObjektList,
  UpdateObjektList,
} from "@/lib/server/db/schema";
import { CosmoObjekt, ObjektBaseFields } from "@/lib/universal/cosmo/objekts";

// alias the indexer type
export type IndexedObjekt = Collection;

type LegacyObjekt = ObjektBaseFields | CosmoObjekt | IndexedObjekt;
export type LegacyObjektResponse<T extends LegacyObjekt> = {
  hasNext: boolean;
  total: number;
  objekts: T[];
  nextStartAfter?: number | undefined;
};

// metadata
interface ObjektInformation extends ObjektMetadataEntry {
  profile?: Pick<Profile, "nickname">;
}
export type ObjektMetadata = {
  total: number;
  transferable: number;
  percentage: number;
  metadata: ObjektInformation | undefined;
};

/**
 * Parse a Cosmo-compatible objekts response.
 */
export function parsePage<T>(data: any) {
  return {
    ...data,
    nextStartAfter: data.nextStartAfter
      ? parseInt(data.nextStartAfter)
      : undefined,
  } as T;
}

/**
 * List of objekt slugs that are unobtainable.
 */
export const unobtainables = [
  // test
  "atom01-artmstest-100u",
  // error in minting
  "atom01-jinsoul-109a",
  // artms 1st anniversary events
  "atom01-heejin-346z",
  "atom01-haseul-346z",
  "atom01-kimlip-346z",
  "atom01-jinsoul-346z",
  "atom01-choerry-346z",
  // chilsung event
  "atom01-heejin-351z",
  "atom01-haseul-351z",
  "atom01-kimlip-351z",
  "atom01-jinsoul-351z",
  "atom01-choerry-351z",
  // virtual angel events
  "binary01-heejin-310z",
  "binary01-haseul-310z",
  "binary01-kimlip-310z",
  "binary01-jinsoul-310z",
  "binary01-choerry-310z",
  // lunar theory events
  "cream01-haseul-330z",
  // zero class
  "atom01-triples-000z",
  "atom01-aaa-000z",
  "atom01-kre-000z",
  // error in minting
  "binary01-mayu-101a",
  "binary01-mayu-104a",
  "binary01-mayu-105a",
  "binary01-mayu-106a",
  "binary01-mayu-107a",
  "binary01-mayu-108a",
  // self-made events
  "divine01-seoyeon-312z",
  "divine01-hyerin-312z",
  "divine01-jiwoo-312z",
  "divine01-chaeyeon-312z",
  "divine01-yooyeon-312z",
  "divine01-soomin-312z",
  "divine01-nakyoung-312z",
  "divine01-yubin-312z",
  "divine01-kaede-312z",
  "divine01-dahyun-312z",
  "divine01-kotone-312z",
  "divine01-yeonji-312z",
  "divine01-nien-312z",
  "divine01-sohyun-312z",
  "divine01-xinyu-312z",
  "divine01-mayu-312z",
  "divine01-lynn-312z",
  "divine01-joobin-312z",
  "divine01-hayeon-312z",
  "divine01-shion-312z",
  "divine01-chaewon-312z",
  "divine01-sullin-312z",
  "divine01-seoah-312z",
  "divine01-jiyeon-312z",
];
