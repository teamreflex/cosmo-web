import { $fetchTokenBalances } from "@/lib/functions/como";
import { remember } from "@/lib/server/cache.server";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import {
  collections,
  members,
  objekts,
  transfers,
} from "@/lib/server/db/indexer/schema";
import { fetchCollectionEvent } from "@/lib/server/objekts/metadata.server";
import { fetchTotal } from "@/lib/server/progress.server";
import type { ObjektCollectionData } from "@/lib/universal/objekts";
import { Addresses, addr, isAddress } from "@apollo/util";
import { and, count, eq, inArray, ne, notInArray, sql } from "drizzle-orm";

const PROFILE_CACHE_TTL = 60 * 15; // 15 minutes
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const EXCLUDED_PROGRESS_CLASSES = ["Welcome", "Zero"];

export type ResolvedUser = {
  address: string;
  nickname: string | null;
};

// A single collection lookup with global supply and event metadata.
export type RoyCollection = {
  member: string;
  season: string;
  collectionNo: string;
  class: string;
  frontImage: string;
  createdAt: string | null;
  totalSupply: number;
  lastTransferAt: string | null;
  data: ObjektCollectionData | undefined;
};

// Per-member copy breakdown for a single collection number.
export type RoyCollectionCopies = {
  season: string;
  collectionNo: string;
  class: string;
  totalSupply: number;
  members: {
    name: string;
    color: string;
    copies: number;
    percentage: number;
  }[];
};

// A flat projection of a single owned objekt.
export type RoyUserObjekt = {
  member: string;
  season: string;
  collectionNo: string;
  class: string;
  serial: number;
  transferable: boolean;
};

// Comparison of two users' collections (user2 is tradeable-only).
export type RoyCompareResult = {
  user1: { nickname: string; objekts: RoyUserObjekt[] };
  user2: { nickname: string; objekts: RoyUserObjekt[] };
};

// A user's full owned objekt list, including duplicates.
export type RoyObjektList = {
  nickname: string;
  objekts: RoyUserObjekt[];
};

// Owned collections vs. the full catalog for a member.
export type RoyProgress = {
  owned: { season: string; collectionNo: string }[];
  catalog: { season: string; collectionNo: string; class: string }[];
};

export type RoyHighlightLabel = "last" | "low-serial" | "most" | "first";

export type RoyProfileHighlight = {
  label: RoyHighlightLabel;
  member: string;
  season: string;
  collectionNo: string;
  serial: number;
  frontImage: string;
  sub: string | null;
};

// Heavy aggregated profile stats for a single wallet.
export type RoyProfile = {
  nickname: string;
  profileImageUrl: string | null;
  totalObjekts: number;
  transferableObjekts: number;
  comoBalance: string;
  collectingSince: string | null;
  classCounts: Record<string, number>;
  seasonCounts: Record<string, number>;
  memberCounts: Record<string, number>;
  favMember: string | null;
  favMemberCompletionPct: number | null;
  activity: {
    totalSent: number;
    objektsMinted: number;
    received30d: number;
    sent30d: number;
    spinCount: number;
    spinScoCount: number;
  };
  highlights: RoyProfileHighlight[];
};

/**
 * Resolve a user input (an address or username) into a user.
 */
export async function resolveUser(input: string): Promise<ResolvedUser | null> {
  const identifier = input.trim();

  const where = isAddress(identifier)
    ? { address: addr(identifier) }
    : { username: identifier };

  const account = await db.query.cosmoAccounts.findFirst({
    where,
    columns: { username: true, address: true },
  });

  if (!account?.username) return null;

  return {
    address: addr(account.address),
    nickname: account.username,
  };
}

type CollectionQuery = {
  artist: string;
  member: string;
  season: string;
  collectionNo: string;
};

/**
 * Look up a single collection with its global supply.
 */
export async function getCollection(
  query: CollectionQuery,
): Promise<RoyCollection | null> {
  const collection = await indexer.query.collections.findFirst({
    where: {
      artist: query.artist,
      member: query.member,
      season: query.season,
      collectionNo: query.collectionNo,
    },
    columns: {
      id: true,
      slug: true,
      member: true,
      season: true,
      collectionNo: true,
      class: true,
      frontImage: true,
      createdAt: true,
    },
  });

  if (!collection) {
    return null;
  }

  const [supply, lastTransfer, data] = await Promise.all([
    indexer
      .select({ total: count() })
      .from(objekts)
      .where(
        and(
          eq(objekts.collectionId, collection.id),
          ne(objekts.owner, Addresses.SPIN),
        ),
      ),
    indexer
      .select({ last: sql<string | null>`MAX(${transfers.timestamp})::text` })
      .from(transfers)
      .where(eq(transfers.collectionId, collection.id)),
    fetchCollectionEvent(collection.slug),
  ]);

  return {
    member: collection.member,
    season: collection.season,
    collectionNo: collection.collectionNo,
    class: collection.class,
    frontImage: collection.frontImage,
    createdAt: collection.createdAt,
    totalSupply: supply[0]?.total ?? 0,
    lastTransferAt: lastTransfer[0]?.last ?? null,
    data,
  };
}

type CopiesQuery = {
  artist: string;
  season: string;
  collectionNo: string;
};

/**
 * Count copies of a collection number per member (excluding the spin account).
 */
export async function getCollectionCopies(
  query: CopiesQuery,
): Promise<RoyCollectionCopies | null> {
  const rows = await indexer
    .select({
      member: collections.member,
      class: collections.class,
      color: members.primaryColorHex,
      copies: count(),
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .leftJoin(members, eq(members.name, collections.member))
    .where(
      and(
        eq(collections.artist, query.artist),
        eq(collections.season, query.season),
        eq(collections.collectionNo, query.collectionNo),
        ne(objekts.owner, Addresses.SPIN),
      ),
    )
    .groupBy(collections.member, collections.class, members.primaryColorHex);

  const first = rows[0];
  if (!first) {
    // zero counted copies is still a valid response — 404 only when the
    // collection number itself doesn't exist
    const collection = await indexer.query.collections.findFirst({
      where: {
        artist: query.artist,
        season: query.season,
        collectionNo: query.collectionNo,
      },
      columns: { class: true },
    });

    if (!collection) {
      return null;
    }

    return {
      season: query.season,
      collectionNo: query.collectionNo,
      class: collection.class,
      totalSupply: 0,
      members: [],
    };
  }

  const total = rows.reduce((sum, row) => sum + row.copies, 0);

  return {
    season: query.season,
    collectionNo: query.collectionNo,
    class: first.class,
    totalSupply: total,
    members: rows
      .map((row) => ({
        name: row.member,
        color: row.color ?? "#000000",
        copies: row.copies,
        percentage: total > 0 ? round2((row.copies / total) * 100) : 0,
      }))
      .sort((a, b) => b.copies - a.copies),
  };
}

type UserObjektsQuery = {
  artist: string;
  member: string | null;
  transferableOnly: boolean;
};

/**
 * Fetch every objekt owned by an address as flat projections, including duplicates.
 * Intentionally unbounded: compare/duplicates consumers need the complete holdings
 * list in one response, so there is no pagination or limit.
 */
export async function fetchUserObjekts(
  address: string,
  query: UserObjektsQuery,
): Promise<RoyUserObjekt[]> {
  return await indexer
    .select({
      member: collections.member,
      season: collections.season,
      collectionNo: collections.collectionNo,
      class: collections.class,
      serial: objekts.serial,
      transferable: objekts.transferable,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.owner, address),
        eq(collections.artist, query.artist),
        ...(query.member !== null
          ? [eq(collections.member, query.member)]
          : []),
        ...(query.transferableOnly ? [eq(objekts.transferable, true)] : []),
      ),
    )
    .orderBy(
      collections.member,
      collections.season,
      collections.collectionNo,
      objekts.serial,
    );
}

type ProgressQuery = {
  artist: string;
  member: string;
  season: string | null;
  class: string | null;
};

/**
 * Fetch the distinct collections an address owns and the full catalog for a
 * member, both scoped to the same optional season/class filters.
 */
export async function getProgress(
  address: string,
  query: ProgressQuery,
): Promise<RoyProgress> {
  const classFilter = query.class
    ? [eq(collections.class, query.class)]
    : [notInArray(collections.class, EXCLUDED_PROGRESS_CLASSES)];
  const seasonFilter = query.season
    ? [eq(collections.season, query.season)]
    : [];

  const [owned, catalog] = await Promise.all([
    indexer
      .selectDistinct({
        season: collections.season,
        collectionNo: collections.collectionNo,
      })
      .from(objekts)
      .innerJoin(collections, eq(objekts.collectionId, collections.id))
      .where(
        and(
          eq(objekts.owner, address),
          eq(collections.artist, query.artist),
          eq(collections.member, query.member),
          ...seasonFilter,
          ...classFilter,
        ),
      ),
    indexer
      .select({
        season: collections.season,
        collectionNo: collections.collectionNo,
        class: collections.class,
      })
      .from(collections)
      .where(
        and(
          eq(collections.artist, query.artist),
          eq(collections.member, query.member),
          ...seasonFilter,
          ...classFilter,
        ),
      ),
  ]);

  return { owned, catalog };
}

/**
 * Build the aggregated profile stats for a resolved user.
 */
export async function getProfile(
  resolved: ResolvedUser,
  artist: string,
): Promise<RoyProfile> {
  return remember(
    `roy-profile:${resolved.address}:${artist}`,
    PROFILE_CACHE_TTL,
    () => buildProfile(resolved, artist),
  );
}

async function buildProfile(
  resolved: ResolvedUser,
  artist: string,
): Promise<RoyProfile> {
  const { address } = resolved;
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  // a single scan of the owned objekts powers counts, totals, and highlights
  const [owned, comoBalance, sent, received] = await Promise.all([
    fetchOwnedObjekts(address, artist),
    fetchComoBalance(address, artist),
    fetchSentActivity(address, artist, cutoff),
    fetchReceivedActivity(address, artist, cutoff),
  ]);

  const agg = aggregateOwned(owned);

  const favMemberCompletionPct =
    agg.favMember !== null
      ? await completionFor(agg.favMember, agg.favMemberOwned)
      : null;

  return {
    nickname: resolved.nickname ?? address,
    profileImageUrl: null,
    totalObjekts: agg.total,
    transferableObjekts: agg.transferable,
    comoBalance,
    collectingSince: agg.collectingSince,
    classCounts: agg.classCounts,
    seasonCounts: agg.seasonCounts,
    memberCounts: agg.memberCounts,
    favMember: agg.favMember,
    favMemberCompletionPct,
    activity: {
      totalSent: sent.totalSent,
      sent30d: sent.sent30d,
      spinCount: sent.spinCount,
      spinScoCount: sent.spinScoCount,
      objektsMinted: received.objektsMinted,
      received30d: received.received30d,
    },
    highlights: agg.highlights,
  };
}

type OwnedObjekt = {
  collectionId: string;
  member: string;
  season: string;
  collectionNo: string;
  class: string;
  frontImage: string;
  serial: number;
  transferable: boolean;
  receivedAt: string;
};

/**
 * Fetch every objekt an address owns for an artist, with the fields needed to
 * compute counts, totals, and highlights in a single pass.
 */
async function fetchOwnedObjekts(
  address: string,
  artist: string,
): Promise<OwnedObjekt[]> {
  return indexer
    .select({
      collectionId: objekts.collectionId,
      member: collections.member,
      season: collections.season,
      collectionNo: collections.collectionNo,
      class: collections.class,
      frontImage: collections.frontImage,
      serial: objekts.serial,
      transferable: objekts.transferable,
      receivedAt: objekts.receivedAt,
    })
    .from(objekts)
    .innerJoin(collections, eq(objekts.collectionId, collections.id))
    .where(and(eq(objekts.owner, address), eq(collections.artist, artist)));
}

/**
 * Derive all profile aggregates (counts, totals, favorite member, highlights)
 * from a single pass over an address's owned objekts.
 */
function aggregateOwned(rows: OwnedObjekt[]) {
  const classCounts: Record<string, number> = {};
  const seasonCounts: Record<string, number> = {};
  const memberCounts: Record<string, number> = {};
  const copiesByCollection = new Map<
    string,
    { row: OwnedObjekt; copies: number }
  >();

  let transferable = 0;
  let collectingSince: string | null = null;
  let last: OwnedObjekt | null = null;
  let first: OwnedObjekt | null = null;
  let lowest: OwnedObjekt | null = null;

  for (const row of rows) {
    if (!EXCLUDED_PROGRESS_CLASSES.includes(row.class)) {
      classCounts[row.class] = (classCounts[row.class] ?? 0) + 1;
    }
    seasonCounts[row.season] = (seasonCounts[row.season] ?? 0) + 1;
    memberCounts[row.member] = (memberCounts[row.member] ?? 0) + 1;
    if (row.transferable) transferable++;

    if (collectingSince === null || row.receivedAt < collectingSince) {
      collectingSince = row.receivedAt;
    }
    if (last === null || row.receivedAt > last.receivedAt) last = row;
    if (first === null || row.receivedAt < first.receivedAt) first = row;
    if (lowest === null || row.serial < lowest.serial) lowest = row;

    // keep the lowest-serial copy as the representative for the "most" highlight
    const entry = copiesByCollection.get(row.collectionId);
    if (!entry) {
      copiesByCollection.set(row.collectionId, { row, copies: 1 });
    } else {
      entry.copies++;
      if (row.serial < entry.row.serial) entry.row = row;
    }
  }

  const favMember = pickFavMember(memberCounts);

  let most: { row: OwnedObjekt; copies: number } | null = null;
  for (const entry of copiesByCollection.values()) {
    if (most === null || entry.copies > most.copies) most = entry;
  }

  // distinct grid-eligible collections owned for the favorite member
  let favMemberOwned = 0;
  if (favMember !== null) {
    const seen = new Set<string>();
    for (const row of rows) {
      if (
        row.member === favMember &&
        !EXCLUDED_PROGRESS_CLASSES.includes(row.class)
      ) {
        seen.add(row.collectionId);
      }
    }
    favMemberOwned = seen.size;
  }

  const highlights = [
    toHighlight("last", last, null),
    toHighlight("low-serial", lowest, lowest ? `#${lowest.serial}` : null),
    toHighlight("first", first, null),
    most !== null && most.copies >= 2
      ? toHighlight("most", most.row, `×${most.copies}`)
      : null,
  ].filter((highlight): highlight is RoyProfileHighlight => highlight !== null);

  return {
    total: rows.length,
    transferable,
    collectingSince,
    classCounts,
    seasonCounts,
    memberCounts,
    favMember,
    favMemberOwned,
    highlights,
  };
}

/**
 * Build a highlight entry from an owned objekt, or null when absent.
 */
function toHighlight(
  label: RoyHighlightLabel,
  row: OwnedObjekt | null,
  sub: string | null,
): RoyProfileHighlight | null {
  if (row === null) return null;
  return {
    label,
    member: row.member,
    season: row.season,
    collectionNo: row.collectionNo,
    serial: row.serial,
    frontImage: row.frontImage,
    sub,
  };
}

/**
 * Resolve an address's COMO balance for a single artist as a string.
 */
async function fetchComoBalance(
  address: string,
  artist: string,
): Promise<string> {
  const balances = await $fetchTokenBalances({ data: { address } });
  const balance = balances.find((b) => b.id.toLowerCase() === artist);
  return String(balance?.amount ?? 0);
}

/**
 * Count an address's outbound activity (sends and spins) for an artist using the sender-indexed transfer column.
 */
async function fetchSentActivity(
  address: string,
  artist: string,
  cutoff: string,
) {
  // filter by the artist's collections via a semi-join rather than a per-row
  // join — and keep the scan anchored on `from` (never the spin index)
  const artistCollections = indexer
    .select({ id: collections.id })
    .from(collections)
    .where(eq(collections.artist, artist));
  const specialCollections = indexer
    .select({ id: collections.id })
    .from(collections)
    .where(
      and(eq(collections.artist, artist), eq(collections.class, "Special")),
    );

  const [row] = await indexer
    .select({
      totalSent:
        sql<number>`COUNT(*) FILTER (WHERE ${transfers.to} NOT IN (${Addresses.NULL}, ${Addresses.SPIN}))`.mapWith(
          Number,
        ),
      sent30d:
        sql<number>`COUNT(*) FILTER (WHERE ${transfers.to} NOT IN (${Addresses.NULL}, ${Addresses.SPIN}) AND ${transfers.timestamp} >= ${cutoff})`.mapWith(
          Number,
        ),
      spinCount:
        sql<number>`COUNT(*) FILTER (WHERE ${transfers.to} = ${Addresses.SPIN})`.mapWith(
          Number,
        ),
      spinScoCount:
        sql<number>`COUNT(*) FILTER (WHERE ${transfers.to} = ${Addresses.SPIN} AND ${inArray(transfers.collectionId, specialCollections)})`.mapWith(
          Number,
        ),
    })
    .from(transfers)
    .where(
      and(
        eq(transfers.from, address),
        inArray(transfers.collectionId, artistCollections),
      ),
    );

  return {
    totalSent: row?.totalSent ?? 0,
    sent30d: row?.sent30d ?? 0,
    spinCount: row?.spinCount ?? 0,
    spinScoCount: row?.spinScoCount ?? 0,
  };
}

/**
 * Count an address's inbound activity (mints and receipts) for an artist using the recipient-indexed transfer column.
 */
async function fetchReceivedActivity(
  address: string,
  artist: string,
  cutoff: string,
) {
  const artistCollections = indexer
    .select({ id: collections.id })
    .from(collections)
    .where(eq(collections.artist, artist));

  const [row] = await indexer
    .select({
      objektsMinted:
        sql<number>`COUNT(*) FILTER (WHERE ${transfers.from} = ${Addresses.NULL})`.mapWith(
          Number,
        ),
      received30d:
        sql<number>`COUNT(*) FILTER (WHERE ${transfers.from} <> ${Addresses.NULL} AND ${transfers.timestamp} >= ${cutoff})`.mapWith(
          Number,
        ),
    })
    .from(transfers)
    .where(
      and(
        eq(transfers.to, address),
        inArray(transfers.collectionId, artistCollections),
      ),
    );

  return {
    objektsMinted: row?.objektsMinted ?? 0,
    received30d: row?.received30d ?? 0,
  };
}

/**
 * Completion % for a member: distinct grid-eligible collections owned (computed
 * from the profile's owned-objekt scan) divided by the member's full catalog.
 */
async function completionFor(
  member: string,
  ownedUnique: number,
): Promise<number | null> {
  const catalog = await fetchTotal({ member });
  if (catalog.length === 0) {
    return null;
  }
  return round2((ownedUnique / catalog.length) * 100);
}

/**
 * Pick the member with the highest owned count, or null when none are owned.
 */
function pickFavMember(memberCounts: Record<string, number>): string | null {
  let favMember: string | null = null;
  let highest = 0;
  for (const [member, value] of Object.entries(memberCounts)) {
    if (value > highest) {
      highest = value;
      favMember = member;
    }
  }
  return favMember;
}

/**
 * Round a number to two decimal places.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
