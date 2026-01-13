import type { ValidArtist } from "../types/common";
import type { ObjektSummariesResponse, ObjektSummary } from "../types/objekts";
import { cosmo } from "./http";

type FetchSummariesParams = {
  session: string;
  artistId: ValidArtist;
  className: string;
};

/**
 * Fetch objekt summaries for a given artist and class.
 */
export async function fetchObjektSummaries({
  session,
  artistId,
  className,
}: FetchSummariesParams): Promise<ObjektSummary[]> {
  const response = await cosmo<ObjektSummariesResponse>(
    "/bff/v3/objekt-summaries",
    {
      headers: {
        Cookie: `user-session=${session}`,
      },
      query: {
        artistId,
        "class[]": className,
        order: "newest",
        page: "1",
        size: "30",
      },
    },
  );

  return response.collections;
}
