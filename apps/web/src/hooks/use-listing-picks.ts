import type {
  ListingFeedWant,
  ListingPick,
  ListingViewer,
} from "@/lib/universal/trade-listings";
import type { TradeWant } from "@apollo/trades/allocate";
import { validateAssignment } from "@apollo/trades/assignment";
import { totalWanted } from "@apollo/trades/composer";
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
  const [picked, setPicked] = useState(
    () => viewer?.rows.map((row) => row.picks) ?? [],
  );
  if (viewer === null) return null;

  return {
    picked,
    valid: validateAssignment(
      rows.map((row) => row.trade),
      picked.map((picks) => picks.map((pick) => pick.tokenId)),
      new Map(picked.flat().map((pick) => [pick.tokenId, pick.attributes])),
    ).ok,
    pickedCount: picked.reduce((total, picks) => total + picks.length, 0),
    total: totalWanted(rows.map((row) => row.trade)),
    short: viewer.rows.reduce((total, row) => total + row.missing, 0),
    /**
     * Takes a copy out of the row, or adds it while the row has room.
     */
    toggle: (row: number, pick: ListingPick) =>
      setPicked((current) =>
        current.map((picks, index) => {
          if (index !== row) return picks;
          if (picks.some((shown) => shown.tokenId === pick.tokenId)) {
            return picks.filter((shown) => shown.tokenId !== pick.tokenId);
          }
          const count = rows[row]?.trade.count ?? 0;
          return picks.length < count ? [...picks, pick] : picks;
        }),
      ),
  };
}

export type Picks = NonNullable<ReturnType<typeof useListingPicks>>;
