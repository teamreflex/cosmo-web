import { z } from "zod";
import {
  validArtists,
  validClasses,
  validOnlineTypes,
  validSeasons,
  validSorts,
} from "./common";
import { parse } from "../parsers";

export type OwnedObjektsResult = {
  hasNext: boolean;
  nextStartAfter?: number;
  total: number;
  objekts: OwnedObjekt[];
};

type OwnedObjektCommonFields = {
  collectionId: string;
  season: string;
  member: string;
  collectionNo: string;
  class: string;
  artists: ("artms" | "tripleS")[];
  thumbnailImage: string;
  frontImage: string;
  backImage: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  comoAmount: number;
  transferablebyDefault: boolean;
  tokenId: string;
  tokenAddress: string;
  objektNo: number;
  transferable: boolean;
  usedForGrid: boolean;
  lenticularPairTokenId: string | null;
  mintedAt: string;
  receivedAt: string;
};

export type NonTransferableReason =
  | "mint-pending"
  | "used-for-grid"
  | "challenge-reward"
  | "welcome-objekt"
  | "effect-objekt"
  | "bookmark-objekt"
  | "lenticular-objekt"
  | "not-transferable"; // indexer

interface OwnedObjektMinted extends OwnedObjektCommonFields {
  status: "minted";
  nonTransferableReason?: NonTransferableReason;
}

interface OwnedObjektPending extends OwnedObjektCommonFields {
  status: "pending";
  nonTransferableReason?: "mint-pending";
}

export type OwnedObjekt = OwnedObjektMinted | OwnedObjektPending;

export type GasStationResult = {
  safeLow: {
    maxFee: number;
    maxPriorityFee: number;
  };
  standard: {
    maxFee: number;
    maxPriorityFee: number;
  };
  fast: {
    maxFee: number;
    maxPriorityFee: number;
  };
  estimatedBaseFee: number;
  blockTime: number;
  blockNumber: number;
};

const bffCollectionGroupSchema = z.object({
  artistName: z.enum(validArtists),
  size: z.coerce.number().optional().default(20),
  page: z.coerce.number().optional().default(1),
  order: z.enum(validSorts),
  collectionIds: z.string().array().optional(),
  memberIds: z.coerce.number().array().optional(),
  class: z.enum(validClasses).array().optional(),
  season: z.enum(validSeasons).array().optional(),
  on_offline: z.enum(validOnlineTypes).optional(),
  transferable: z.coerce.boolean().optional(),
  gridable: z.coerce.boolean().optional(),
});

export type BFFCollectionGroupParams = z.infer<typeof bffCollectionGroupSchema>;

/**
 * Parse collection group params.
 */
export function parseBffCollectionGroupParams(params: URLSearchParams) {
  return parse(
    bffCollectionGroupSchema,
    {
      artistName: params.get("artistName"),
      size: params.get("size"),
      page: params.get("page"),
      order: params.get("order"),
      collectionIds: params.getAll("collectionIds"),
      memberIds: params.getAll("memberIds"),
      class: params.getAll("class"),
      season: params.getAll("season"),
      on_offline: params.get("on_offline"),
      transferable: params.get("transferable"),
      gridable: params.get("gridable"),
    },
    {
      artistName: "artms",
      size: 20,
      page: 1,
      order: "newest",
    }
  );
}

export type BFFCollectionGroupResponse = {
  collectionCount: number;
  collections: BFFCollectionGroup[];
};

export type BFFCollectionGroup = {
  collection: BFFCollectionGroupCollection;
  count: number;
  objekts: BFFCollectionGroupObjekt[];
};

export type BFFCollectionGroupCollection = {
  collectionId: string;
  season: string;
  collectionNo: string;
  class: string;
  member: string;
  artistName: string;
  thumbnailImage: string;
  frontImage: string;
  backImage: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  comoAmount: number;
  transferableByDefault: boolean;
  gridableByDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BFFCollectionGroupObjekt = {
  nonTransferableReason?: NonTransferableReason;
  metadata: {
    collectionId: string;
    objektNo: number;
    tokenId: number;
    transferable: boolean;
  };
  inventory: {
    objektId: number;
    owner: string;
    status: "minted" | "pending";
    usedForGrid: boolean;
    mintedAt: string;
    lenticularPairTokenId: number;
    acquiredAt: string;
    updatedAt: string;
  };
};
