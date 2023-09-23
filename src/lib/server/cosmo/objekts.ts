import { COSMO_ENDPOINT } from "./common";

export const validSorts = [
  "newest",
  "oldest",
  "noAscending",
  "noDescending",
] as const;
export type ValidSort = (typeof validSorts)[number];
export const validSeasons = ["Atom01", "Binary01"] as const;
export type ValidSeason = (typeof validSeasons)[number];
export const validClasses = [
  "First",
  "Special",
  "Double",
  "Welcome",
  "Zero",
] as const;
export type ValidClass = (typeof validClasses)[number];
export const validOnlineTypes = ["online", "offline"] as const;
export type ValidOnlineType = (typeof validOnlineTypes)[number];

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
};

type OwnedByMeInput = ObjektQueryParams & {
  token: string;
};

export type OwnedObjektsResult = {
  hasNext: boolean;
  nextStartAfter?: string;
  total: number;
  objekts: OwnedObjekt[];
};

export type OwnedObjekt = {
  collectionId: string;
  season: string;
  member: string;
  collectionNo: string;
  class: string;
  artists: ("artms" | "tripleS")[];
  thumbnailIMage: string;
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
  status: "minted";
  usedForGrid: boolean;
  mintedAt: string;
  receivedAt: string;
};

const parseArray = <T>(value?: T[]) =>
  value ? (value.length > 0 ? value.join(",") : "") : "";

/**
 * Fetch the list of objekts owned by the user.
 * @param {OwnedByMeInput} options
 * @param {string} options.token - Cosmo token to act upon
 * @param {number} options.startAfter - pagination cursor
 * @param {number | undefined} options.nextStartAfter - next pagination cursor
 * @param {string | undefined} options.member - member name to filter by
 * @param {string | undefined} options.artist - artist name to filter by
 * @param {ValidSort} options.sort
 * @param {ValidClass[] | undefined} options.classType
 * @param {ValidOnlineType[] | undefined} options.onlineType
 * @param {boolean | undefined} options.transferable
 * @param {boolean | undefined} options.gridable
 * @returns Promise<OwnedObjektsResult>
 */
export async function ownedByMe({
  token,
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
}: OwnedByMeInput): Promise<OwnedObjektsResult> {
  const query = new URLSearchParams({
    start_after: startAfter.toString(),
    sort,
    season: parseArray(season),
    artist: artist ?? "",
    member: member ?? "",
    class: parseArray(classType),
    on_offline: parseArray(onlineType),
  });

  if (transferable) {
    query.append("transferable", "true");
  }
  if (gridable) {
    query.append("gridable", "true");
  }

  const res = await fetch(
    `${COSMO_ENDPOINT}/objekt/v1/owned-by/me?${query.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    console.log(await res.json());
    throw new Error("Failed to fetch objekts");
  }

  return (await res.json()) as OwnedObjektsResult;
}
