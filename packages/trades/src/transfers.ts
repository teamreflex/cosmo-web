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

/**
 * What a batch of outbox rows means for one live trade: an item arrived, or
 * one of its tokens went elsewhere or turned untransferable.
 */
export type TradeChainEvent =
  | { type: "transferred"; itemId: number; at: Date; hash: string }
  | { type: "token_moved" | "token_untransferable"; tokenId: number };

/**
 * Decide a drain batch's rows in order, keyed by token. An item that arrives
 * counts as transferred for the rows after it, so a token passed on in the
 * same batch is recorded once and isn't reported as moved. Each trade's
 * events keep row order, and each listing or pending offer breaks once, on
 * the first token that breaks it.
 */
export function foldTransfers(
  rows: readonly ChainRow[],
  expected: ReadonlyMap<number, readonly ExpectedItem[]>,
) {
  const arrived = new Set<number>();
  const trades = new Map<string, TradeChainEvent[]>();
  const breaks = new Map<string, number>();
  const post = (tradeId: string, event: TradeChainEvent) => {
    const events = trades.get(tradeId);
    if (events === undefined) trades.set(tradeId, [event]);
    else events.push(event);
  };

  for (const row of rows) {
    const items = (expected.get(row.tokenId) ?? []).map((item) =>
      item.kind === "live" && arrived.has(item.itemId)
        ? { ...item, transferred: true }
        : item,
    );
    for (const decision of decideTransfer(row, items)) {
      switch (decision.type) {
        case "transferred":
          arrived.add(decision.itemId);
          post(decision.tradeId, {
            type: "transferred",
            itemId: decision.itemId,
            at: decision.at,
            hash: decision.hash,
          });
          break;
        case "event":
          post(decision.tradeId, {
            type: decision.event,
            tokenId: row.tokenId,
          });
          break;
        case "breaks":
          if (!breaks.has(decision.offerId)) {
            breaks.set(decision.offerId, row.tokenId);
          }
          break;
        case "ignore":
          break;
      }
    }
  }

  return {
    trades,
    breaks: Array.from(breaks, ([offerId, tokenId]) => ({ offerId, tokenId })),
  };
}
