import { listingRatio } from "@/lib/client/trade-listings";
import {
  type Candidate,
  type ListingFeedWant,
  type ListingPick,
  toggleOffered,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import { fitsWant, scaleWants, type TradeWant } from "@apollo/trades/allocate";
import { validateAssignment } from "@apollo/trades/assignment";
import { totalWanted } from "@apollo/trades/composer";
import type { ListingAcceptance } from "@apollo/trades/lifecycle";
import { useState } from "react";

export type PickerRow = {
  want: ListingFeedWant;
  trade: TradeWant;
};

/**
 * What Accept or Make an offer froze for the confirm dialog: how many
 * units, the pool objekts the viewer gets, their picks, one list per want
 * row, whether the viewer chose to make an offer, and when, which the
 * trade's deadline or the offer's expiry counts from.
 */
export type ConfirmSnapshot = {
  units: number;
  offered: number[];
  picked: ListingPick[][];
  offer: boolean;
  frozenAt: Date;
};

/**
 * The viewer's claim as they build it: how many units, the pool objekts
 * they get, their picks per want row, and whether it all fits. A bundle
 * (no `ratio`) takes its whole pool, so it has no units or pool picks to
 * choose. Null unless the viewer is picking.
 */
export function useListingPicks(
  listing: Pick<TradeListing, "unitSize" | "items" | "wants" | "payment">,
  viewer: Candidate | null,
  rows: PickerRow[],
  // whether Accept claims, sends an offer, or the viewer picks which
  acceptance: ListingAcceptance,
) {
  const { unitSize } = listing;
  const wants = rows.map((row) => row.trade);
  const free = listing.items.flatMap((item) =>
    item.availability.kind === "free" ? [item.tokenId] : [],
  );
  const [state, setState] = useState(() => ({
    units: 1,
    offered: Array.of<number>(),
    picked: rows.map((): ListingPick[] => []),
  }));
  if (viewer === null) return null;

  const { units, picked } = state;
  const ratio = listingRatio(listing, listing.items.length);
  const offeredCount = unitSize * units;
  // a bundle takes its whole pool, so only a ratio's pool picks are the viewer's to make
  const offered =
    ratio === null
      ? free.slice(0, offeredCount)
      : state.offered.filter((tokenId) => free.includes(tokenId));
  const scaled = scaleWants(wants, units);
  const giveTotal = totalWanted(scaled);
  const update = (next: (current: typeof state) => Partial<typeof state>) =>
    setState((current) => ({ ...current, ...next(current) }));

  return {
    units,
    // the most the viewer can take; the stepper starts at one even when they can't fill it
    maxUnits: Math.max(viewer.units, 1),
    ratio,
    freeCount: free.length,
    acceptance,
    takesOffers: acceptance !== "claim",
    offered,
    offeredCount,
    picked,
    // the want rows at this many units
    wants: scaled,
    // the listing's payment for each unit, on whichever side sends it
    payment: listing.payment,
    valid:
      offered.length === offeredCount &&
      validateAssignment(
        scaled,
        picked.map((picks) => picks.map((pick) => pick.tokenId)),
        new Map(picked.flat().map((pick) => [pick.tokenId, pick.attributes])),
      ),
    giveTotal,
    pickedCount:
      offered.length + picked.reduce((total, picks) => total + picks.length, 0),
    total: offeredCount + giveTotal,
    short: viewer.rows.reduce((total, row) => total + row.missing, 0),
    freeze: (offer: boolean): ConfirmSnapshot => ({
      units,
      offered,
      picked,
      offer,
      frozenAt: new Date(),
    }),
    /**
     * Takes that many units: the pool picks and each want row keep what
     * they can.
     */
    setUnits: (next: number) => {
      const clamped = Math.min(Math.max(next, 1), Math.max(viewer.units, 1));
      update((current) => ({
        units: clamped,
        offered: current.offered
          .filter((tokenId) => free.includes(tokenId))
          .slice(0, unitSize * clamped),
        picked: current.picked.map((picks, index) =>
          picks.slice(0, (wants[index]?.count ?? 0) * clamped),
        ),
      }));
    },
    toggleOffered: (tokenId: number) =>
      update((current) => ({
        offered: toggleOffered(
          current.offered.filter((shown) => free.includes(shown)),
          tokenId,
          unitSize * current.units,
        ),
      })),
    // a pool pick the server says another trade took
    dropOffered: (tokenId: number) =>
      update((current) => ({
        offered: current.offered.filter((shown) => shown !== tokenId),
      })),
    /**
     * Takes a copy out of the row, or adds it while the row has room and it
     * fits the row. The picker lists only what fits, so the fit check only
     * mirrors the server's rule.
     */
    toggle: (row: number, pick: ListingPick) =>
      update((current) => ({
        picked: current.picked.map((picks, index) => {
          if (index !== row) return picks;
          if (picks.some((shown) => shown.tokenId === pick.tokenId)) {
            return picks.filter((shown) => shown.tokenId !== pick.tokenId);
          }
          const want = wants[row];
          return want !== undefined &&
            picks.length < want.count * current.units &&
            fitsWant(want, pick.attributes)
            ? [...picks, pick]
            : picks;
        }),
      })),
  };
}

export type Picks = NonNullable<ReturnType<typeof useListingPicks>>;
