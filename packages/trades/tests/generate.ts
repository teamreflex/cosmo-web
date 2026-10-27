import type { TradeWant } from "../src/allocate";
import { rangeFilterSchema } from "../src/range";

/**
 * A small seeded PRNG (mulberry32), so property runs are reproducible.
 */
export function seeded(seed: number) {
  let state = seed;
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  const int = (min: number, max: number) =>
    min + Math.floor(next() * (max - min + 1));
  const pick = <T>(values: readonly T[]): T => {
    const value = values[int(0, values.length - 1)];
    if (value === undefined) throw new Error("pick from an empty list");
    return value;
  };
  const some = <T>(values: readonly T[]) => values.filter(() => next() < 0.4);
  return { int, pick, some };
}

export type Random = ReturnType<typeof seeded>;

// a narrow universe, so rows overlap and inventories run short often
const seasons = ["Atom01", "Atom02", "Binary01"];
const members = ["HeeJin", "KimLip", "HaSeul"];
const classes = ["First", "Double"];
const onOfflines = ["online", "offline"] as const;
const artists = ["artms", "tripleS"] as const;

/**
 * A random listing's trade side, mixing exact, range and choice rows, and a
 * random inventory of copies, ranked within each collection the way the
 * candidate query ranks them.
 */
export function generateCase(random: Random) {
  const collections = Array.from({ length: random.int(1, 6) }, () => {
    const season = random.pick(seasons);
    const member = random.pick(members);
    const objektClass = random.pick(classes);
    const onOffline = random.pick(onOfflines);
    const artist = random.pick(artists).toLowerCase();
    return {
      slug: `${artist}-${season}-${member}-${objektClass}-${onOffline}`.toLowerCase(),
      artist,
      member,
      collectionNo: "101Z",
      season,
      class: objektClass,
      onOffline,
    };
  });

  let tokenId = 1;
  const unranked = collections.flatMap((collection) =>
    Array.from({ length: random.int(0, 8) }, () => ({
      ...collection,
      tokenId: tokenId++,
      // a narrow serial range, so ties break on token id
      serial: random.int(0, 20),
    })),
  );
  const inventory = unranked.map((objekt) => ({
    ...objekt,
    rank:
      unranked
        .filter((other) => other.slug === objekt.slug)
        .toSorted((a, b) => b.serial - a.serial || a.tokenId - b.tokenId)
        .indexOf(objekt) + 1,
  }));

  const wants: TradeWant[] = [];
  for (let row = random.int(1, 4); row > 0; row--) {
    const kind = random.pick(["exact", "range", "choice"] as const);
    if (kind === "exact") {
      const slug = random.pick(collections).slug;
      if (wants.some((want) => want.kind === "exact" && want.slug === slug)) {
        continue;
      }
      wants.push({ kind: "exact", slug, count: random.int(1, 4) });
      continue;
    }
    if (kind === "choice") {
      const slugs = [
        ...new Set(random.some(collections).map(({ slug }) => slug)),
      ];
      if (slugs.length >= 2) {
        wants.push({ kind: "choice", slugs, count: random.int(1, 4) });
      }
      continue;
    }
    const filter = rangeFilterSchema.safeParse({
      artist: random.some(artists),
      member: random.some(members),
      season: random.some(seasons),
      class: random.some(classes),
      on_offline: random.some(onOfflines),
    });
    if (filter.success) {
      wants.push({
        kind: "range",
        filter: filter.data,
        count: random.int(1, 5),
      });
    }
  }

  return { wants, inventory };
}
