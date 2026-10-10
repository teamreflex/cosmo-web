/**
 * One outbox row as the drain reads it, with the token id parsed to the
 * integer the trade tables store.
 */
export type ChainRow =
  | {
      type: "transfer";
      tokenId: number;
      from: string;
      to: string;
      timestamp: Date;
      hash: string;
    }
  | {
      type: "transferability";
      tokenId: number;
      transferable: boolean;
      timestamp: Date;
    };

/**
 * A row in the trade tables that holds the row's token. A live item belongs
 * to an accepted or disputed trade and should move `from` → `to`. An offered
 * item is on an open listing or a pending direct offer, held by `from`.
 */
export type ExpectedItem =
  | {
      kind: "live";
      itemId: number;
      tradeId: string;
      from: string;
      to: string;
      transferred: boolean;
    }
  | { kind: "offered"; offerId: string; from: string };

export type TransferDecision =
  // the token reached its receiver
  | {
      type: "transferred";
      itemId: number;
      tradeId: string;
      at: Date;
      hash: string;
    }
  // the listing breaks, or the pending offer goes stale
  | { type: "breaks"; offerId: string }
  // a live trade's token went elsewhere; the trade gets a timeline event
  | {
      type: "event";
      tradeId: string;
      event: "token_moved" | "token_untransferable";
    }
  | { type: "ignore" };

/**
 * What one outbox row means for each item holding its token, in the same
 * order. Addresses compare case-insensitively.
 */
export function decideTransfer(
  row: ChainRow,
  expectedItems: readonly ExpectedItem[],
): TransferDecision[] {
  return expectedItems.map((item) => decideItem(row, item));
}

function decideItem(row: ChainRow, item: ExpectedItem): TransferDecision {
  if (item.kind === "live" && item.transferred) return { type: "ignore" };

  if (row.type === "transferability") {
    if (row.transferable) return { type: "ignore" };
    return item.kind === "live"
      ? { type: "event", tradeId: item.tradeId, event: "token_untransferable" }
      : { type: "breaks", offerId: item.offerId };
  }

  // a transfer into the holder, or between others, changes nothing here
  if (!sameAddress(row.from, item.from)) return { type: "ignore" };

  if (item.kind === "offered") return { type: "breaks", offerId: item.offerId };
  return sameAddress(row.to, item.to)
    ? {
        type: "transferred",
        itemId: item.itemId,
        tradeId: item.tradeId,
        at: row.timestamp,
        hash: row.hash,
      }
    : { type: "event", tradeId: item.tradeId, event: "token_moved" };
}

function sameAddress(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}
