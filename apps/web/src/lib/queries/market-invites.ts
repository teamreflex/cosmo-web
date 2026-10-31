import { $fetchMarketInvitesLeft } from "@/lib/functions/market-invites";
import { queryOptions } from "@tanstack/react-query";
import { tradesKey } from "./trades";

/**
 * Under tradesKey, so removeViewerQueries() drops it with the viewer's
 * trades. Never fresh, so each opening of the dialog rereads it, because
 * another tab may have spent an invite.
 */
export const marketInvitesLeftQuery = queryOptions({
  queryKey: [...tradesKey, "invites-left"],
  queryFn: ({ signal }) => $fetchMarketInvitesLeft({ signal }),
  staleTime: 0,
});
