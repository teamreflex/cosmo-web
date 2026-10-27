import { currentAccountQuery } from "@/lib/queries/core";
import { tradeListingQuery } from "@/lib/queries/trade-listings";
import {
  candidatePanel,
  type ListingViewer,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import { useSuspenseQueries } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { useState } from "react";
import type { Notice } from "./listing-status";
import ListingView, { type ListingRole } from "./listing-view";

type Props = {
  id: string;
};

/**
 * A trade listing. A closed listing shows how it ended; an open one shows
 * the viewer's role as the server's answer names it. A lost race or a
 * changed listing stays on the page as a strip under the header, whatever
 * the refetch turns the page into.
 */
export default function ListingDetail({ id }: Props) {
  const [{ data: page }, { data: account }] = useSuspenseQueries({
    queries: [tradeListingQuery(id), currentAccountQuery],
  });
  const [notice, setNotice] = useState<Notice | null>(null);
  if (page === null) throw notFound();

  const { listing, viewer } = page;
  const role = listingRole(listing, viewer);
  return (
    <ListingView
      // new terms or a different most units start the picks over
      key={
        role.role === "picker"
          ? `${listing.updatedAt.toISOString()}:${role.viewer.units}`
          : role.role
      }
      listing={listing}
      role={role}
      address={account?.cosmo?.address}
      notice={notice}
      onNotice={setNotice}
    />
  );
}

function listingRole(
  listing: TradeListing,
  viewer: ListingViewer,
): ListingRole {
  if (listing.state.status !== "open") {
    return {
      role: "closed",
      state: listing.state,
      tradeId: viewer.role === "closed" ? viewer.tradeId : null,
    };
  }
  switch (viewer.role) {
    case "anonymous":
      return { role: "signed_out" };
    // one read of the listing row answers both halves
    case "closed":
      throw new Error(
        `listing ${listing.id} is open but its viewer read it closed`,
      );
    case "unlinked":
    case "poster":
    case "claimer":
    case "offerer":
      return viewer;
    case "candidate": {
      const panel = candidatePanel(listing, viewer);
      switch (panel) {
        case "picker":
          return { role: "picker", viewer };
        case "cap":
          return { role: "refused", reason: "cap", claims: viewer.claims };
        case "blocked":
        case "busy":
          return { role: "refused", reason: panel };
      }
    }
  }
}
