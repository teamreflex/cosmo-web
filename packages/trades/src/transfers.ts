import type {
  StaleReason,
  TradeSide,
  TradeStatus,
} from "@apollo/database/web/types";
import { addr } from "@apollo/util";
import { isOpenTrade, otherSide } from "./lifecycle";

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
  // the listing breaks, or the pending offer goes stale, and why
  | { type: "breaks"; offerId: string; reason: StaleReason }
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
      : { type: "breaks", offerId: item.offerId, reason: "untransferable" };
  }

  // reaching the receiver delivers it, even when the sender routed it through another wallet
  if (item.kind === "live" && sameAddress(row.to, item.to)) {
    return {
      type: "transferred",
      itemId: item.itemId,
      tradeId: item.tradeId,
      at: row.timestamp,
      hash: row.hash,
    };
  }

  // a transfer into the holder, or between others, changes nothing here
  if (!sameAddress(row.from, item.from)) return { type: "ignore" };

  return item.kind === "offered"
    ? { type: "breaks", offerId: item.offerId, reason: "moved" }
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
 * events keep row order. Each listing or pending offer breaks once, on the
 * first token that breaks it, with why it did, and `departed` holds every
 * token that left each one, which a listing drops from its pool.
 */
export function foldTransfers(
  rows: readonly ChainRow[],
  expected: ReadonlyMap<number, readonly ExpectedItem[]>,
) {
  const arrived = new Set<number>();
  const trades = new Map<string, TradeChainEvent[]>();
  const breaks = new Map<string, { tokenId: number; reason: StaleReason }>();
  const departed = new Map<string, Set<number>>();
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
        case "breaks": {
          if (!breaks.has(decision.offerId)) {
            breaks.set(decision.offerId, {
              tokenId: row.tokenId,
              reason: decision.reason,
            });
          }
          const tokens = departed.get(decision.offerId);
          if (tokens === undefined) {
            departed.set(decision.offerId, new Set([row.tokenId]));
          } else {
            tokens.add(row.tokenId);
          }
          break;
        }
        case "ignore":
          break;
      }
    }
  }

  return {
    trades,
    breaks,
    departed: new Map(
      [...departed].map(([offerId, tokens]) => [offerId, [...tokens]]),
    ),
  };
}

/**
 * Where an item stands. `sent` is recorded by the drain, and `arrived` is
 * in the receiver's account before the drain has seen it. `moved` left the
 * sender for someone else, and `untransferable` can't move. Nothing counts
 * before an offer is accepted: a pending offer's token still with its
 * sender is `not_started`, and one already with its receiver has only left
 * its sender, so it is `moved`. An ended trade's unsent items are
 * `not_sent`.
 */
export type TradeItemStatus =
  | "sent"
  | "arrived"
  | "waiting"
  | "not_started"
  | "moved"
  | "untransferable"
  | "not_sent";

/**
 * An item's status: recorded first, then, while the trade is pending or
 * live, its token's indexed owner against the trade's pinned addresses. A
 * token the indexer doesn't know is still waiting, or not started on a
 * pending offer.
 */
export function itemStatus(
  item: { sender: TradeSide; transferredAt: Date | null },
  token: { owner: string; transferable: boolean } | undefined,
  trade: { status: TradeStatus; fromAddress: string; toAddress: string | null },
): TradeItemStatus {
  if (item.transferredAt !== null) return "sent";
  if (!isOpenTrade(trade.status)) return "not_sent";
  const waiting = trade.status === "pending" ? "not_started" : "waiting";
  if (token === undefined) return waiting;
  const pinned = {
    from: addr(trade.fromAddress),
    to: trade.toAddress === null ? null : addr(trade.toAddress),
  };
  if (token.owner === pinned[otherSide(item.sender)]) {
    return trade.status === "pending" ? "moved" : "arrived";
  }
  if (token.owner !== pinned.from && token.owner !== pinned.to) return "moved";
  return token.transferable ? waiting : "untransferable";
}
