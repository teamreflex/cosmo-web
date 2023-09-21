import { COSMO_ENDPOINT } from "./common";

export type ObjektQueryParams = OwnedObjektsSearchParams & {
  showLocked: boolean;
};

export type OwnedObjektsSearchParams = {
  startAfter: number;
  nextStartAfter?: number;
  member?: string;
  artist?: "artms" | "tripleS";
  sort: "newest" | "oldest" | "noAscending" | "noDescending";
};

type OwnedByMeInput = OwnedObjektsSearchParams & {
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

/**
 * Fetch the list of objekts owned by the user.
 * @param {OwnedByMeInput} options
 * @param {string} options.token - Cosmo token to act upon
 * @param {number} options.startAfter - pagination cursor
 * @param {number | undefined} options.nextStartAfter - next pagination cursor
 * @param {string | undefined} options.member - member name to filter by
 * @param {string | undefined} options.artist - artist name to filter by
 * @param {"newest" | "oldest" | "noAscending" | "noDescending"} options.sort
 * @returns Promise<OwnedObjektsResult>
 */
export async function ownedByMe({
  token,
  startAfter,
  nextStartAfter,
  member,
  artist,
  sort,
}: OwnedByMeInput): Promise<OwnedObjektsResult> {
  const query = new URLSearchParams({
    start_after: startAfter.toString(),
    member: member ?? "",
    sort,
  });
  if (artist) {
    query.append("artist", artist);
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
    throw new Error("Failed to fetch objekts");
  }

  return (await res.json()) as OwnedObjektsResult;
}
