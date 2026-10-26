import {
  type ListingOfferSummary,
  type ListingTrade,
  type PosterTab,
  posterTabCounts,
  shownPosterTab,
} from "@/lib/universal/trade-listings";
import { getRouteApi } from "@tanstack/react-router";

const route = getRouteApi("/market/listing/$id");

/**
 * The poster's tabs on their own listing, the one open and what fills
 * them.
 */
export type PosterSections = {
  tabs: { tab: PosterTab; count: number }[];
  tab: PosterTab;
  offers: ListingOfferSummary[];
  trades: ListingTrade[];
};

/**
 * The poster's tabs from their side of the listing, open on the one the URL
 * asks for while the listing has it (shownPosterTab); null for anyone else.
 */
export function usePosterSections(
  poster: { offers: ListingOfferSummary[]; trades: ListingTrade[] } | null,
  takesOffers: boolean,
): PosterSections | null {
  const requested = route.useSearch({ select: (search) => search.tab });
  if (poster === null) return null;
  const tabs = posterTabCounts({ takesOffers }, poster);
  return {
    tabs,
    tab: shownPosterTab(requested, tabs),
    offers: poster.offers,
    trades: poster.trades,
  };
}
