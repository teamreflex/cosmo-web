import type {
  ListingFeedWant,
  ListingViewer,
} from "@/lib/universal/trade-listings";
import { fitsWant, type TradeWant } from "@apollo/trades/allocate";
import { validateAssignment } from "@apollo/trades/assignment";
import { totalWanted } from "@apollo/trades/composer";
import { togglePick } from "@apollo/trades/picker";
import { useState } from "react";

type Candidate = Extract<ListingViewer, { role: "candidate" }>;

export type PickerRow = {
  want: ListingFeedWant;
  trade: TradeWant;
};

/**
 * The viewer's picks for each want row, starting from the server's
 * allocation, and what they add up to: whether they fit the listing
 * exactly, and how many objekts the viewer is short of filling it. Null
 * unless the viewer is picking.
 */
export function useListingPicks(viewer: Candidate | null, rows: PickerRow[]) {
  const [picks, setPicks] = useState(
    () => viewer?.allocation.map((allocation) => allocation.tokenIds) ?? [],
  );
  if (viewer === null) return null;

  const candidates = rows.map((row) =>
    viewer.inventory.filter((candidate) =>
      fitsWant(row.trade, candidate.attributes),
    ),
  );
  // a refetched inventory can drop a picked copy, which then can't be unpicked
  const picked = candidates.map((rowCandidates, row) =>
    (picks[row] ?? []).filter((tokenId) =>
      rowCandidates.some((candidate) => candidate.tokenId === tokenId),
    ),
  );
  const valid = validateAssignment(
    rows.map((row) => row.trade),
    picked,
    new Map(
      viewer.inventory.map((candidate) => [
        candidate.tokenId,
        candidate.attributes,
      ]),
    ),
  ).ok;

  return {
    candidates,
    picked,
    valid,
    pickedCount: picked.reduce((total, row) => total + row.length, 0),
    total: totalWanted(rows.map((row) => row.trade)),
    short: viewer.allocation.reduce(
      (total, allocation) => total + allocation.missing,
      0,
    ),
    toggle: (row: number, tokenId: number, count: number) =>
      setPicks(togglePick(picked, row, tokenId, count)),
  };
}

export type Picks = NonNullable<ReturnType<typeof useListingPicks>>;
