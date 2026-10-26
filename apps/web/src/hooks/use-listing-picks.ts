import {
  hasRatio,
  type ListingFeedWant,
  type ListingPick,
  type ListingViewer,
  offeredForUnits,
  picksForUnits,
  toggleOffered,
  type TradeListing,
} from "@/lib/universal/trade-listings";
import { scaleWants, type TradeWant } from "@apollo/trades/allocate";
import { validateAssignment } from "@apollo/trades/assignment";
import { totalWanted } from "@apollo/trades/composer";
import { CLAIM_WINDOW, OFFER_WINDOW } from "@apollo/trades/timers";
import { useState } from "react";

type Candidate = Extract<ListingViewer, { role: "candidate" }>;

export type PickerRow = {
  want: ListingFeedWant;
  trade: TradeWant;
};

/**
 * What Accept froze for the confirm dialog: how many units, the pool
 * objekts the viewer gets, their picks, one list per want row, how many
 * each row asks for at that size, whether it sends an offer, and when the
 * trade would have to finish if it were claimed then, or the offer expire
 * if sent then.
 */
export type ConfirmSnapshot = {
  units: number;
  offered: number[];
  picked: ListingPick[][];
  counts: number[];
  takesOffers: boolean;
  endsAt: Date;
};

/**
 * The viewer's claim as they build it: how many units, the pool objekts
 * they get (`offered`, the first free ones to start with, and only those
 * still free as the viewer's answer refetches) and their picks for each
 * want row (the server's allocation trimmed to that many units), and what
 * it adds up to: whether both sides fit the listing exactly, and how many
 * objekts the viewer is short of filling it. A bundle's unit is its whole
 * pool, so it has no units or pool picks to choose. Null unless the viewer
 * is picking.
 */
export function useListingPicks(
  listing: Pick<TradeListing, "unitSize" | "items">,
  viewer: Candidate | null,
  rows: PickerRow[],
) {
  const { unitSize } = listing;
  const wants = rows.map((row) => row.trade);
  const free =
    viewer?.pool.flatMap(({ tokenId, availability }) =>
      availability.kind === "free" ? [tokenId] : [],
    ) ?? [];
  const [state, setState] = useState(() => ({
    units: 1,
    offered: offeredForUnits([], free, unitSize),
    picked: viewer === null ? [] : picksForUnits(viewer.rows, wants, 1),
  }));
  if (viewer === null) return null;

  const { units, picked } = state;
  const offered = state.offered.filter((tokenId) => free.includes(tokenId));
  const scaled = scaleWants(wants, units);
  const offeredCount = unitSize * units;
  const giveTotal = totalWanted(scaled);
  const update = (next: (current: typeof state) => Partial<typeof state>) =>
    setState((current) => ({ ...current, ...next(current) }));

  return {
    units,
    // the most the viewer can take; the stepper starts at one even when they can't fill it
    maxUnits: Math.max(viewer.units, 1),
    bundle: !hasRatio(unitSize, listing.items.length),
    freeCount: free.length,
    pool: viewer.pool,
    takesOffers: viewer.takesOffers,
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
      counts: scaled.map((want) => want.count),
      takesOffers: viewer.takesOffers,
      endsAt: new Date(
        Date.now() + (viewer.takesOffers ? OFFER_WINDOW : CLAIM_WINDOW),
      ),
    }),
    /**
     * Takes that many units: the pool picks and each want row keep what
     * they can, and a row with room tops up from the server's picks.
     */
    setUnits: (next: number) => {
      const clamped = Math.min(Math.max(next, 1), Math.max(viewer.units, 1));
      update((current) => ({
        units: clamped,
        offered: offeredForUnits(current.offered, free, unitSize * clamped),
        picked: picksForUnits(viewer.rows, wants, clamped, current.picked),
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
