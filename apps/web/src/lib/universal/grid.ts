import { seasonSort } from "@/lib/universal/seasons";
import type { ValidArtist } from "@apollo/cosmo/types/common";

export type GridEditionDef = {
  edition: 1 | 2 | 3;
  numbers: readonly string[];
  rewards: readonly [string, string];
};

const EDITION_NUMBERS: Record<1 | 2 | 3, readonly string[]> = {
  1: ["101", "102", "103", "104", "105", "106", "107", "108"],
  2: ["109", "110", "111", "112", "113", "114", "115", "116"],
  3: ["117", "118", "119", "120"],
};

export const STANDARD_EDITIONS: readonly GridEditionDef[] = [
  { edition: 1, numbers: EDITION_NUMBERS[1], rewards: ["201", "202"] },
  { edition: 2, numbers: EDITION_NUMBERS[2], rewards: ["203", "204"] },
  { edition: 3, numbers: EDITION_NUMBERS[3], rewards: ["205", "206"] },
];

// tripleS Atom01 grids predate the standard reward numbering
export const ATOM01_EDITIONS: readonly GridEditionDef[] = [
  { edition: 1, numbers: EDITION_NUMBERS[1], rewards: ["201", "202"] },
  { edition: 2, numbers: EDITION_NUMBERS[2], rewards: ["216", "217"] },
  { edition: 3, numbers: EDITION_NUMBERS[3], rewards: ["218", "219"] },
];

export const IDNTT_EDITIONS: readonly GridEditionDef[] = [
  { edition: 1, numbers: EDITION_NUMBERS[1], rewards: ["301", "302"] },
];

export const IDNTT_UNIT_NO = "401";

/**
 * The class of objekt that grids consume for the given artist.
 */
export function sourceClassFor(artist: ValidArtist): "First" | "Basic" {
  return artist === "idntt" ? "Basic" : "First";
}

/**
 * The edition recipes that can exist for the given artist and season. Which
 * editions actually exist is derived from the catalog in buildGridLedger.
 */
export function editionDefsFor(
  artist: ValidArtist,
  season: string,
): readonly GridEditionDef[] {
  if (artist === "idntt") return IDNTT_EDITIONS;
  if (artist === "tripleS" && season === "Atom01") return ATOM01_EDITIONS;
  return STANDARD_EDITIONS;
}

export type GridCatalogRow = {
  season: string;
  member: string;
  class: string;
  collectionNo: string;
  slug: string;
};

export type GridOwnedRow = {
  season: string;
  member: string;
  class: string;
  collectionNo: string;
  transferable: boolean;
  count: number;
};

export type GridOwnedToken = {
  season: string;
  member: string;
  collectionNo: string;
  tokenId: string;
  serial: number;
};

export type GridMemberRef = {
  name: string;
  alias: string;
  sortOrder: number;
};

export type NumberPool = {
  collectionNo: string;
  slug: string;
  usable: number;
  total: number;
  // full collectionNo retains the A/Z designation pooled into this number
  nonTransferable: { tokenId: string; serial: number; collectionNo: string }[];
};

export type RewardPool = {
  collectionNo: string;
  slug: string | null;
  owned: number;
};

export type EditionLedger = {
  edition: 1 | 2 | 3;
  numbers: NumberPool[];
  completable: number;
  deficits: { collectionNo: string; slug: string }[];
  rewards: [RewardPool, RewardPool];
};

export type SeasonLedger = {
  season: string;
  editions: EditionLedger[];
};

export type MemberLedger = {
  member: string;
  seasons: SeasonLedger[];
};

export type UnitCapacity = {
  member: string;
  ownedUnits: number;
  spendable: number;
  spendableSafe: number;
};

export type UnitPair = {
  members: [string, string];
  slug: string;
  owned: number;
  achievable: boolean;
};

export type UnitSeasonLedger = {
  season: string;
  maxUnits: number;
  capacities: UnitCapacity[];
  pairs: UnitPair[];
};

export type GridLedger = {
  artist: ValidArtist;
  members: MemberLedger[];
  units: UnitSeasonLedger[] | null;
};

export type GridLedgerInput = {
  artist: ValidArtist;
  catalog: GridCatalogRow[];
  owned: GridOwnedRow[];
  nonTransferableTokens: GridOwnedToken[];
  memberOrder: GridMemberRef[];
};

function stripNo(collectionNo: string) {
  return collectionNo.slice(0, -1);
}

function designationOf(collectionNo: string) {
  return collectionNo.slice(-1).toUpperCase();
}

/**
 * Two-level map keyed by member then season, so names with spaces are safe.
 */
class MemberSeasonMap<T> {
  private map = new Map<string, Map<string, T>>();

  get(member: string, season: string): T | undefined {
    return this.map.get(member)?.get(season);
  }

  getOrCreate(member: string, season: string, create: () => T): T {
    let seasons = this.map.get(member);
    if (!seasons) {
      seasons = new Map();
      this.map.set(member, seasons);
    }
    let value = seasons.get(season);
    if (value === undefined) {
      value = create();
      seasons.set(season, value);
    }
    return value;
  }

  *entries(): IterableIterator<[string, string, T]> {
    for (const [member, seasons] of this.map) {
      for (const [season, value] of seasons) {
        yield [member, season, value];
      }
    }
  }
}

type SourcePool = { transferable: number; total: number };
type RewardCount = { transferable: number; nonTransferable: number };

/**
 * Builds the full grid ledger for one artist from indexer-derived rows.
 */
export function buildGridLedger(input: GridLedgerInput): GridLedger {
  const { artist, catalog, owned, nonTransferableTokens, memberOrder } = input;
  const sourceClass = sourceClassFor(artist);

  // catalog lookups: source-class slug per stripped number (Z preferred over
  // A), Z-designation Special slugs, and idntt unit pair slugs per season
  const sourceCatalog = new MemberSeasonMap<Map<string, string>>();
  const rewardCatalog = new MemberSeasonMap<Map<string, string>>();
  const unitCatalog = new Map<string, Map<string, string>>();

  for (const row of catalog) {
    const no = stripNo(row.collectionNo);
    const isZ = designationOf(row.collectionNo) === "Z";

    if (row.class === sourceClass) {
      const numbers = sourceCatalog.getOrCreate(
        row.member,
        row.season,
        () => new Map(),
      );
      if (isZ || !numbers.has(no)) numbers.set(no, row.slug);
    } else if (row.class === "Special" && isZ) {
      rewardCatalog
        .getOrCreate(row.member, row.season, () => new Map())
        .set(no, row.slug);
    } else if (
      artist === "idntt" &&
      row.class === "Unit" &&
      no === IDNTT_UNIT_NO
    ) {
      let pairs = unitCatalog.get(row.season);
      if (!pairs) {
        pairs = new Map();
        unitCatalog.set(row.season, pairs);
      }
      pairs.set(row.member, row.slug);
    }
  }

  // owned counts: source pools split transferable/total, Z-designation reward
  // specials split transferable/non-transferable, unit counts per pair string
  const sourceCounts = new MemberSeasonMap<Map<string, SourcePool>>();
  const rewardCounts = new MemberSeasonMap<Map<string, RewardCount>>();
  const unitCounts = new Map<string, Map<string, number>>();

  for (const row of owned) {
    const no = stripNo(row.collectionNo);

    if (row.class === sourceClass) {
      const pools = sourceCounts.getOrCreate(
        row.member,
        row.season,
        () => new Map(),
      );
      const pool = pools.get(no) ?? { transferable: 0, total: 0 };
      pool.total += row.count;
      if (row.transferable) pool.transferable += row.count;
      pools.set(no, pool);
    } else if (
      row.class === "Special" &&
      designationOf(row.collectionNo) === "Z"
    ) {
      const rewards = rewardCounts.getOrCreate(
        row.member,
        row.season,
        () => new Map(),
      );
      const pool = rewards.get(no) ?? { transferable: 0, nonTransferable: 0 };
      if (row.transferable) pool.transferable += row.count;
      else pool.nonTransferable += row.count;
      rewards.set(no, pool);
    } else if (
      artist === "idntt" &&
      row.class === "Unit" &&
      no === IDNTT_UNIT_NO
    ) {
      let pairs = unitCounts.get(row.season);
      if (!pairs) {
        pairs = new Map();
        unitCounts.set(row.season, pairs);
      }
      pairs.set(row.member, (pairs.get(row.member) ?? 0) + row.count);
    }
  }

  const tokensByPool = new MemberSeasonMap<
    Map<string, NumberPool["nonTransferable"]>
  >();
  for (const token of nonTransferableTokens) {
    const pools = tokensByPool.getOrCreate(
      token.member,
      token.season,
      () => new Map(),
    );
    const no = stripNo(token.collectionNo);
    const tokens = pools.get(no) ?? [];
    tokens.push({
      tokenId: token.tokenId,
      serial: token.serial,
      collectionNo: token.collectionNo,
    });
    pools.set(no, tokens);
  }
  for (const [, , pools] of tokensByPool.entries()) {
    for (const tokens of pools.values()) {
      tokens.sort((a, b) => a.serial - b.serial);
    }
  }

  // ledger includes every member+season the target owns relevant objekts in
  const memberSeasons = new Map<string, Set<string>>();
  const markRelevant = (member: string, season: string) => {
    let seasons = memberSeasons.get(member);
    if (!seasons) {
      seasons = new Set();
      memberSeasons.set(member, seasons);
    }
    seasons.add(season);
  };
  for (const [member, season] of sourceCounts.entries()) {
    markRelevant(member, season);
  }
  for (const [member, season, rewards] of rewardCounts.entries()) {
    // event specials are counted too, but only grid rewards make a season relevant
    const rewardNos = new Set(
      editionDefsFor(artist, season).flatMap((def) => [...def.rewards]),
    );
    if ([...rewards.keys()].some((no) => rewardNos.has(no))) {
      markRelevant(member, season);
    }
  }

  const sortOrders = new Map(memberOrder.map((m) => [m.name, m.sortOrder]));
  const memberSort = (a: string, b: string) =>
    (sortOrders.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (sortOrders.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b);

  const members: MemberLedger[] = [];
  for (const [member, ownedSeasons] of [...memberSeasons.entries()].sort(
    (a, b) => memberSort(a[0], b[0]),
  )) {
    const seasons: SeasonLedger[] = [];

    for (const season of [...ownedSeasons].sort(seasonSort)) {
      const catalogNumbers = sourceCatalog.get(member, season);
      if (!catalogNumbers) continue;

      const pools = sourceCounts.get(member, season);
      const tokens = tokensByPool.get(member, season);
      const rewards = rewardCounts.get(member, season);
      const rewardSlugs = rewardCatalog.get(member, season);

      const editions: EditionLedger[] = [];
      for (const def of editionDefsFor(artist, season)) {
        // an edition exists only when its full number set is in the catalog
        const numbers: NumberPool[] = [];
        for (const no of def.numbers) {
          const slug = catalogNumbers.get(no);
          if (slug === undefined) break;

          const pool = pools?.get(no);
          numbers.push({
            collectionNo: no,
            slug,
            usable: pool?.transferable ?? 0,
            total: pool?.total ?? 0,
            nonTransferable: tokens?.get(no) ?? [],
          });
        }
        if (numbers.length !== def.numbers.length) continue;

        editions.push({
          edition: def.edition,
          numbers,
          ...completion(numbers),
          rewards: [
            rewardPool(def.rewards[0], rewardSlugs, rewards),
            rewardPool(def.rewards[1], rewardSlugs, rewards),
          ],
        });
      }

      if (editions.length > 0) {
        seasons.push({ season, editions });
      }
    }

    if (seasons.length > 0) {
      members.push({ member, seasons });
    }
  }

  return {
    artist,
    members,
    units:
      artist === "idntt"
        ? buildUnitLedgers({
            unitCatalog,
            unitCounts,
            rewardCounts,
            memberOrder,
          })
        : null,
  };
}

/**
 * Derive the completable count and next-grid deficits for an edition's pools.
 * The deficit for grid #completable+1 is always exactly one copy per number.
 */
function completion(numbers: NumberPool[]) {
  const completable = Math.min(...numbers.map((n) => n.usable));
  return {
    completable,
    deficits: numbers
      .filter((n) => n.usable === completable)
      .map((n) => ({ collectionNo: n.collectionNo, slug: n.slug })),
  };
}

function rewardPool(
  collectionNo: string,
  slugs: Map<string, string> | undefined,
  counts: Map<string, RewardCount> | undefined,
): RewardPool {
  const pool = counts?.get(collectionNo);
  return {
    collectionNo,
    slug: slugs?.get(collectionNo) ?? null,
    owned: pool ? pool.transferable + pool.nonTransferable : 0,
  };
}

function buildUnitLedgers(input: {
  unitCatalog: Map<string, Map<string, string>>;
  unitCounts: Map<string, Map<string, number>>;
  rewardCounts: MemberSeasonMap<Map<string, RewardCount>>;
  memberOrder: GridMemberRef[];
}): UnitSeasonLedger[] {
  const { unitCatalog, unitCounts, rewardCounts, memberOrder } = input;
  const aliasToName = new Map(memberOrder.map((m) => [m.alias, m.name]));
  const sortOrders = new Map(memberOrder.map((m) => [m.name, m.sortOrder]));
  const memberSort = (a: string, b: string) =>
    (sortOrders.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (sortOrders.get(b) ?? Number.MAX_SAFE_INTEGER) || a.localeCompare(b);

  // per member+season spendable capacity from Z-designation reward specials
  const spendables = new MemberSeasonMap<{
    spendable: number;
    spendableSafe: number;
  }>();
  const rewardNos = new Set(IDNTT_EDITIONS.flatMap((def) => [...def.rewards]));
  for (const [member, season, rewards] of rewardCounts.entries()) {
    const capacity = spendables.getOrCreate(member, season, () => ({
      spendable: 0,
      spendableSafe: 0,
    }));
    for (const [no, pool] of rewards) {
      if (!rewardNos.has(no)) continue;
      capacity.spendable += pool.transferable;
      // keep one of each reward; a non-transferable copy is the keeper
      capacity.spendableSafe += Math.max(
        0,
        pool.transferable - Math.max(0, 1 - pool.nonTransferable),
      );
    }
  }

  const ledgers: UnitSeasonLedger[] = [];
  for (const [season, pairSlugs] of unitCatalog) {
    const ownedPairs = unitCounts.get(season);

    const capacities = new Map<string, UnitCapacity>();
    const capacityFor = (member: string) => {
      let capacity = capacities.get(member);
      if (!capacity) {
        const spendable = spendables.get(member, season);
        capacity = {
          member,
          ownedUnits: 0,
          spendable: spendable?.spendable ?? 0,
          spendableSafe: spendable?.spendableSafe ?? 0,
        };
        capacities.set(member, capacity);
      }
      return capacity;
    };

    const pairs: UnitPair[] = [];
    for (const [pairString, slug] of pairSlugs) {
      // resolve "idN X idM" via member aliases, falling back to the raw token
      const [aliasA, aliasB] = pairString.split(" X ");
      if (!aliasA || !aliasB) continue;

      const owned = ownedPairs?.get(pairString) ?? 0;
      const a = capacityFor(aliasToName.get(aliasA) ?? aliasA);
      const b = capacityFor(aliasToName.get(aliasB) ?? aliasB);
      a.ownedUnits += owned;
      b.ownedUnits += owned;

      pairs.push({
        members: [a.member, b.member],
        slug,
        owned,
        achievable: a.spendable >= 1 && b.spendable >= 1,
      });
    }

    const sortedCapacities = [...capacities.values()]
      .filter((c) => c.ownedUnits > 0 || c.spendable > 0)
      .sort((a, b) => memberSort(a.member, b.member));

    if (sortedCapacities.length === 0) continue;

    ledgers.push({
      season,
      maxUnits: computeMaxUnits(sortedCapacities.map((c) => c.spendable)),
      capacities: sortedCapacities,
      pairs: pairs.sort(
        (a, b) =>
          memberSort(a.members[0], b.members[0]) ||
          memberSort(a.members[1], b.members[1]),
      ),
    });
  }

  return ledgers.sort((a, b) => seasonSort(a.season, b.season));
}

/**
 * Maximum units producible when each unit consumes one special from two
 * distinct members and repeat pairings are allowed: min(⌊S/2⌋, S − max).
 */
export function computeMaxUnits(capacities: number[]): number {
  const sum = capacities.reduce((acc, c) => acc + c, 0);
  const max = Math.max(0, ...capacities);
  return Math.max(0, Math.min(Math.floor(sum / 2), sum - max));
}

/**
 * Recompute a ledger with the given non-transferable tokens counted as usable.
 * View-local: the selection is never persisted.
 */
export function applyGridOverrides(
  ledger: GridLedger,
  includedTokenIds: ReadonlySet<string>,
): GridLedger {
  if (includedTokenIds.size === 0) return ledger;

  return {
    ...ledger,
    members: ledger.members.map((member) => ({
      ...member,
      seasons: member.seasons.map((season) => ({
        ...season,
        editions: season.editions.map((edition) => {
          const numbers = edition.numbers.map((pool) => {
            const included = pool.nonTransferable.filter((t) =>
              includedTokenIds.has(t.tokenId),
            ).length;
            return included > 0
              ? { ...pool, usable: pool.usable + included }
              : pool;
          });

          return { ...edition, numbers, ...completion(numbers) };
        }),
      })),
    })),
  };
}
