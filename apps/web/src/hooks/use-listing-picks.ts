import { listingRatio } from "@/lib/client/trade-listings";
import {
  type Candidate,
  type ListingFeedWant,
  type ListingPick,
  toggleOffered,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import { scaleWants, type TradeWant } from "@apollo/trades/allocate";
import { validateAssignment } from "@apollo/trades/assignment";
import { totalWanted } from "@apollo/trades/composer";
import { CLAIM_WINDOW, OFFER_WINDOW } from "@apollo/trades/timers";
import { useState } from "react";

export type PickerRow = {
  want: Exclude<ListingFeedWant, { kind: "payment" }>;
  trade: TradeWant;
};

/**
 * What Accept froze for the confirm dialog: how many units, the pool
 * objekts the viewer gets, their picks, one list per want row, and when the
 * trade would have to finish if it were claimed then, or the offer expire
 * if sent then.
 */
export type ConfirmSnapshot = {
  units: number;
  offered: number[];
  picked: ListingPick[][];
  endsAt: Date;
};

/**
 * The viewer's claim as they build it: how many units, the pool objekts
 * they get, their picks per want row, and whether it all fits. A bundle
 * (no `ratio`) takes its whole pool, so it has no units or pool picks to
 * choose. Null unless the viewer is picking.
 */
export function useListingPicks(
  listing: Pick<TradeListing, "unitSize" | "items" | "wants">,
  viewer: Candidate | null,
  rows: PickerRow[],
  // whether Accept sends an offer, as on a listing with a range row
  offers: boolean,
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
    takesOffers: offers,
    offered,
    offeredCount,
    picked,
    // the want rows at this many units
    wants: scaled,
    valid:
      offered.length === offeredCount &&
      validateAssignment(
        scaled,
        picked.map((picks) => picks.map((pick) => pick.tokenId)),
        new Map(picked.flat().map((pick) => [pick.tokenId, pick.attributes])),
      ).ok,
    giveTotal,
    pickedCount:
      offered.length + picked.reduce((total, picks) => total + picks.length, 0),
    total: offeredCount + giveTotal,
    short: viewer.rows.reduce((total, row) => total + row.missing, 0),
    freeze: (): ConfirmSnapshot => ({
      units,
      offered,
      picked,
      endsAt: new Date(Date.now() + (offers ? OFFER_WINDOW : CLAIM_WINDOW)),
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
     * Takes a copy out of the row, or adds it while the row has room.
     */
    toggle: (row: number, pick: ListingPick) =>
      update((current) => ({
        picked: current.picked.map((picks, index) => {
          if (index !== row) return picks;
          if (picks.some((shown) => shown.tokenId === pick.tokenId)) {
            return picks.filter((shown) => shown.tokenId !== pick.tokenId);
          }
          const count = (wants[row]?.count ?? 0) * current.units;
          return picks.length < count ? [...picks, pick] : picks;
        }),
      })),
  };
}

export type Picks = NonNullable<ReturnType<typeof useListingPicks>>;
