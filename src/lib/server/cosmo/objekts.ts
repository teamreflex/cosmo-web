import {
  COSMO_ENDPOINT,
  ValidClass,
  ValidOnlineType,
  ValidSeason,
  ValidSort,
} from "./common";

export type ObjektQueryParams = {
  startAfter: number;
  nextStartAfter?: number;
  member?: string;
  artist?: "artms" | "tripleS";
  sort: ValidSort;
  season?: ValidSeason[];
  classType?: ValidClass[];
  onlineType?: ValidOnlineType[];
  transferable?: boolean;
  gridable?: boolean;
  usedForGrid?: boolean;
  collection?: string;
};

type OwnedByMeInput = ObjektQueryParams & {
  address: "me" | (string & {});
  token: string;
};

export type OwnedObjektsResult = {
  hasNext: boolean;
  nextStartAfter?: string;
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
  mintedAt: string;
  receivedAt: string;
};

type OwnedObjektMinted = OwnedObjektCommonFields & {
  status: "minted";
};

type OwnedObjektPending = OwnedObjektCommonFields & {
  status: "pending";
  nonTransferableReason?: "mint-pending";
};

export type OwnedObjekt = OwnedObjektMinted | OwnedObjektPending;

const parseArray = <T>(value?: T[]) =>
  value ? (value.length > 0 ? value.join(",") : "") : "";

/**
 * Fetch the list of objekts owned by the user.
 * @param {OwnedByMeInput} options
 * @param {string} options.token - Cosmo token to act upon
 * @param {string} options.address - address to fetch
 * @param {number} options.startAfter - pagination cursor
 * @param {number | undefined} options.nextStartAfter - next pagination cursor
 * @param {string | undefined} options.member - member name to filter by
 * @param {string | undefined} options.artist - artist name to filter by
 * @param {ValidSort} options.sort
 * @param {ValidClass[] | undefined} options.classType
 * @param {ValidOnlineType[] | undefined} options.onlineType
 * @param {boolean | undefined} options.transferable
 * @param {boolean | undefined} options.gridable
 * @param {boolean | undefined} options.usedForGrid
 * @param {string | undefined} options.collection
 * @returns Promise<OwnedObjektsResult>
 */
export async function ownedBy({
  token,
  address,
  startAfter,
  nextStartAfter,
  member,
  artist,
  sort,
  season,
  classType,
  onlineType,
  transferable,
  gridable,
  usedForGrid,
  collection,
}: OwnedByMeInput): Promise<OwnedObjektsResult> {
  const query = new URLSearchParams({
    start_after: startAfter.toString(),
    sort,
    season: parseArray(season),
    artist: artist ?? "",
    member: member ?? "",
    class: parseArray(classType),
    on_offline: parseArray(onlineType),
    collection: collection ?? "",
  });

  if (transferable) {
    query.append("transferable", "true");
  }
  if (gridable) {
    query.append("gridable", "true");
  }
  if (usedForGrid !== undefined) {
    query.append("used_for_grid", usedForGrid ? "true" : "false");
  }

  const res = await fetch(
    `${COSMO_ENDPOINT}/objekt/v1/owned-by/${address}?${query.toString()}`,
    {
      method: "GET",
      headers: {
        ...(address === "me" && { Authorization: `Bearer ${token}` }), // only pass token when fetching for "me"
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch objekts");
  }

  return (await res.json()) as OwnedObjektsResult;
}

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
