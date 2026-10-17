import { Addresses } from "@apollo/util";
import type { Transfer } from "../server/db/indexer/schema";
import type { SpinOutcome, TransferObjekt, TransferRow } from "./transfers";

/**
 * The transfer fields grouping needs, without the objekt.
 */
export type ChainItem = {
  transfer: Pick<Transfer, "id" | "from" | "to" | "timestamp">;
};

/**
 * Transfers between the same two users this close together form one group.
 * A group with transfers in both directions is shown as a trade.
 */
export const TRADE_GAP_MS = 15 * 60 * 1000;

/**
 * A spin's reward is minted within this long; a spin younger than this
 * without a reward is still pending.
 */
export const SPIN_REWARD_WINDOW_MS = 120 * 1000;

/**
 * A reward never lands sooner than this after its spin, so a spin sent in
 * the same moment as the previous spin's reward doesn't claim it.
 */
const SPIN_REWARD_DELAY_MS = 3 * 1000;

type GroupInput = {
  address: string;
  // the transfers rows are listed at, in list order, newest first
  page: TransferObjekt[];
  // spin transfer id -> its reward mint
  rewards: Map<string, TransferObjekt>;
  // every transfer in a chain with one of the page's user transfers
  related: TransferObjekt[];
  now: number;
};

export const time = (t: ChainItem) => new Date(t.transfer.timestamp).getTime();

/**
 * Oldest first by (timestamp, id), the reverse of the list's cursor order.
 * Each timestamp is parsed once.
 */
function ascending<T extends ChainItem>(items: T[]) {
  return items
    .map((item) => ({ item, at: time(item) }))
    .toSorted(
      (a, b) =>
        a.at - b.at || a.item.transfer.id.localeCompare(b.item.transfer.id),
    );
}

/**
 * The other party of a transfer between the owner and another user.
 */
function counterpartyOf(address: string, t: ChainItem) {
  return t.transfer.from === address ? t.transfer.to : t.transfer.from;
}

/**
 * Split each counterparty's user transfers into chains where each transfer is
 * within TRADE_GAP_MS of the previous one. Returns transfer id -> its chain,
 * oldest first.
 */
export function chainTransfers<T extends ChainItem>(
  address: string,
  transfers: T[],
) {
  const byCounterparty = Map.groupBy(
    transfers.filter((t) => isUserTransfer(address, t)),
    (t) => counterpartyOf(address, t),
  );

  const chains = new Map<string, T[]>();
  for (const list of byCounterparty.values()) {
    let chain: T[] = [];
    let lastAt = -Infinity;
    for (const { item, at } of ascending(list)) {
      if (at - lastAt > TRADE_GAP_MS) chain = [];
      chain.push(item);
      chains.set(item.transfer.id, chain);
      lastAt = at;
    }
  }
  return chains;
}

/**
 * Chains with one of the page's transfers that could continue past the time
 * ranges read: ones without TRADE_GAP_MS of read time on both sides inside a
 * single range. Returns each one's counterparty and oldest and newest times.
 */
export function unfinishedChains(
  address: string,
  page: ChainItem[],
  chains: Map<string, ChainItem[]>,
  ranges: { lo: number; hi: number }[],
) {
  return [...new Set(page.map((t) => chains.get(t.transfer.id) ?? []))].flatMap(
    (chain) => {
      const [first] = chain;
      const last = chain.at(-1);
      if (!first || !last) return [];

      const oldest = time(first);
      const newest = time(last);
      const covered = ranges.some(
        ({ lo, hi }) =>
          lo <= oldest - TRADE_GAP_MS && newest + TRADE_GAP_MS <= hi,
      );
      return covered
        ? []
        : [{ counterparty: counterpartyOf(address, first), oldest, newest }];
    },
  );
}

/**
 * Pair the owner's spins with their reward mints. A spin's reward is its
 * first mint between SPIN_REWARD_DELAY_MS and SPIN_REWARD_WINDOW_MS later,
 * unless the owner spun again more than SPIN_REWARD_DELAY_MS before it.
 * Returns spin id -> mint id.
 */
export function pairSpins(spins: ChainItem[], mints: ChainItem[]) {
  const sortedSpins = ascending(spins);
  const sortedMints = ascending(mints);

  const pairs = new Map<string, string>();
  // spins are ascending, so a mint too early for one spin is too early for the rest
  let earliest = 0;
  for (const [i, { item: spin, at: start }] of sortedSpins.entries()) {
    while (
      (sortedMints[earliest]?.at ?? Infinity) <
      start + SPIN_REWARD_DELAY_MS
    ) {
      earliest++;
    }
    const reward = sortedMints[earliest];
    if (!reward || reward.at > start + SPIN_REWARD_WINDOW_MS) continue;

    const next = sortedSpins[i + 1];
    const claimedByNext =
      next !== undefined &&
      next.at <= start + SPIN_REWARD_WINDOW_MS &&
      reward.at >= next.at + SPIN_REWARD_DELAY_MS;
    if (!claimedByNext) pairs.set(spin.transfer.id, reward.item.transfer.id);
  }
  return pairs;
}

/**
 * Ids of every transfer in a chain with one of the page's user transfers:
 * the ones the page's rows display.
 */
export function chainedIds(
  address: string,
  page: ChainItem[],
  chains: Map<string, ChainItem[]>,
) {
  return new Set(
    page
      .filter((t) => isUserTransfer(address, t))
      .flatMap((t) =>
        (chains.get(t.transfer.id) ?? [t]).map((m) => m.transfer.id),
      ),
  );
}

/**
 * Ids of transfers in chains that went both ways: the ones that render as
 * trades.
 */
export function tradedIds(address: string, chains: Map<string, ChainItem[]>) {
  return new Set(
    [...new Set(chains.values())]
      .filter((chain) => isTrade(address, chain))
      .flatMap((chain) => chain.map((t) => t.transfer.id)),
  );
}

/**
 * The page's transfers that a row is listed at. A spin's reward renders
 * inside its spin, and a chain renders once, at its newest transfer in the
 * stream: every page computes the same one, so a chain split across pages
 * never renders twice.
 */
export function rowTransfers<T extends ChainItem>(
  page: T[],
  chains: Map<string, ChainItem[]>,
  rewardIds: Set<string>,
  inStream: Set<string>,
) {
  return page.filter((t) => {
    const { id, from } = t.transfer;
    if (from === Addresses.NULL) return !rewardIds.has(id);

    const anchor = chains.get(id)?.findLast((m) => inStream.has(m.transfer.id));
    return (anchor ?? t).transfer.id === id;
  });
}

/**
 * Fold the transfers rows are listed at into display rows.
 */
export function groupTransfers({
  address,
  page,
  rewards,
  related,
  now,
}: GroupInput): TransferRow[] {
  const chains = chainTransfers(address, related);

  return page.map((t): TransferRow => {
    const { id, timestamp, from, to } = t.transfer;

    if (from === address && to === Addresses.SPIN) {
      const reward = rewards.get(id) ?? null;
      return {
        kind: "spin",
        id,
        timestamp,
        spun: t,
        reward,
        outcome: spinOutcome(t, reward !== null, now),
      };
    }

    if (from === Addresses.NULL) {
      return { kind: "mint", id, timestamp, objekt: t };
    }

    // burns have no counterparty to group with
    if (to === Addresses.NULL) {
      return {
        kind: "sent",
        id,
        timestamp,
        counterparty: { address: to, username: null },
        objekts: [t],
      };
    }

    return chainRow(address, t, chains.get(id) ?? [t]);
  });
}

/**
 * A transfer between the owner and another user, not a mint, burn or spin.
 */
function isUserTransfer(address: string, t: ChainItem) {
  const { from, to } = t.transfer;
  return (
    from !== Addresses.NULL &&
    to !== Addresses.NULL &&
    !(from === address && to === Addresses.SPIN)
  );
}

export function spinOutcome(
  spin: ChainItem,
  rewarded: boolean,
  now: number,
): SpinOutcome {
  if (rewarded) return "success";
  return now - time(spin) < SPIN_REWARD_WINDOW_MS ? "pending" : "fail";
}

/**
 * A chain with transfers both ways.
 */
function isTrade(address: string, chain: ChainItem[]) {
  return (
    chain.some((t) => t.transfer.from === address) &&
    chain.some((t) => t.transfer.from !== address)
  );
}

/**
 * Build the row for a chain: a trade when both sides sent, otherwise a
 * one-way batch.
 */
function chainRow(
  address: string,
  anchor: TransferObjekt,
  chain: TransferObjekt[],
): TransferRow {
  const { id, timestamp } = anchor.transfer;
  const counterparty = {
    address: counterpartyOf(address, anchor),
    username: null,
  };
  const sent = chain.filter((t) => t.transfer.from === address);
  const received = chain.filter((t) => t.transfer.from !== address);

  if (isTrade(address, chain)) {
    return { kind: "trade", id, timestamp, counterparty, sent, received };
  }
  return sent.length > 0
    ? { kind: "sent", id, timestamp, counterparty, objekts: sent }
    : { kind: "received", id, timestamp, counterparty, objekts: received };
}
