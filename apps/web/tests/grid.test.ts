import type { ValidArtist } from "@apollo/cosmo/types/common";
import { describe, expect, it } from "bun:test";
import type {
  GridCatalogRow,
  GridLedgerInput,
  GridMemberRef,
  GridOwnedRow,
  GridOwnedToken,
} from "../src/lib/universal/grid";
import {
  applyGridOverrides,
  buildGridLedger,
  computeMaxUnits,
} from "../src/lib/universal/grid";

function catalogRow(
  season: string,
  member: string,
  className: string,
  collectionNo: string,
): GridCatalogRow {
  return {
    season,
    member,
    class: className,
    collectionNo,
    slug: `${season}-${member}-${collectionNo}`.toLowerCase(),
  };
}

function ownedRow(
  season: string,
  member: string,
  className: string,
  collectionNo: string,
  transferable: boolean,
  count = 1,
): GridOwnedRow {
  return {
    season,
    member,
    class: className,
    collectionNo,
    transferable,
    count,
  };
}

function token(
  season: string,
  member: string,
  collectionNo: string,
  tokenId: string,
  serial: number,
): GridOwnedToken {
  return { season, member, collectionNo, tokenId, serial };
}

function range(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, i) => `${from + i}`);
}

/**
 * Catalog for a full 3-edition tripleS/artms season: First 101Z-120Z and the
 * standard Z-designation reward Specials.
 */
function fullSeasonCatalog(
  season: string,
  member: string,
  rewards = ["201", "202", "203", "204", "205", "206"],
): GridCatalogRow[] {
  return [
    ...range(101, 120).map((no) =>
      catalogRow(season, member, "First", `${no}Z`),
    ),
    ...rewards.map((no) => catalogRow(season, member, "Special", `${no}Z`)),
  ];
}

const memberRefs: GridMemberRef[] = [
  { name: "SeoYeon", alias: "S1", sortOrder: 1 },
  { name: "JinSoul", alias: "JinSoul", sortOrder: 3 },
  { name: "HeeJin", alias: "HeeJin", sortOrder: 1 },
  { name: "DoHun", alias: "id1", sortOrder: 1 },
  { name: "HeeJu", alias: "id2", sortOrder: 2 },
  { name: "TaeIn", alias: "id4", sortOrder: 3 },
];

function build(input: Partial<GridLedgerInput> & { artist: ValidArtist }) {
  return buildGridLedger({
    catalog: [],
    owned: [],
    nonTransferableTokens: [],
    memberOrder: memberRefs,
    ...input,
  });
}

describe("buildGridLedger", () => {
  it("derives all three editions for a full season and computes pools", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: fullSeasonCatalog("Atom02", "SeoYeon"),
      owned: [
        ...range(101, 108).map((no) =>
          ownedRow("Atom02", "SeoYeon", "First", `${no}Z`, true),
        ),
        ownedRow("Atom02", "SeoYeon", "First", "109Z", true, 2),
      ],
    });

    expect(ledger.members).toHaveLength(1);
    expect(ledger.units).toBeNull();

    const seasons = ledger.members[0]?.seasons;
    expect(seasons).toHaveLength(1);

    const editions = seasons?.[0]?.editions ?? [];
    expect(editions.map((e) => e.edition)).toEqual([1, 2, 3]);
    expect(editions[0]?.numbers).toHaveLength(8);
    expect(editions[1]?.numbers).toHaveLength(8);
    expect(editions[2]?.numbers).toHaveLength(4);

    expect(editions[0]?.completable).toBe(1);
    expect(editions[0]?.rewards.map((r) => r.collectionNo)).toEqual([
      "201",
      "202",
    ]);
    expect(editions[1]?.completable).toBe(0);
    expect(
      editions[1]?.numbers.find((n) => n.collectionNo === "109")?.usable,
    ).toBe(2);
  });

  it("emits only the first edition when the catalog has a single edition", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: [
        ...range(101, 108).map((no) =>
          catalogRow("Cream02", "SeoYeon", "First", `${no}Z`),
        ),
        catalogRow("Cream02", "SeoYeon", "Special", "201Z"),
        catalogRow("Cream02", "SeoYeon", "Special", "202Z"),
      ],
      owned: [ownedRow("Cream02", "SeoYeon", "First", "101Z", true)],
    });

    const editions = ledger.members[0]?.seasons[0]?.editions ?? [];
    expect(editions.map((e) => e.edition)).toEqual([1]);
  });

  it("uses the Atom01 reward exception for tripleS only", () => {
    const catalog = fullSeasonCatalog("Atom01", "SeoYeon", [
      "201",
      "202",
      "216",
      "217",
      "218",
      "219",
    ]);
    const owned = [ownedRow("Atom01", "SeoYeon", "First", "101Z", true)];

    const triples = build({ artist: "tripleS", catalog, owned });
    const editions = triples.members[0]?.seasons[0]?.editions ?? [];
    expect(editions[1]?.rewards.map((r) => r.collectionNo)).toEqual([
      "216",
      "217",
    ]);
    expect(editions[2]?.rewards.map((r) => r.collectionNo)).toEqual([
      "218",
      "219",
    ]);

    // artms Atom01 uses the standard numbering
    const artmsCatalog = fullSeasonCatalog("Atom01", "HeeJin");
    const artms = build({
      artist: "artms",
      catalog: artmsCatalog,
      owned: [ownedRow("Atom01", "HeeJin", "First", "101Z", true)],
    });
    const artmsEditions = artms.members[0]?.seasons[0]?.editions ?? [];
    expect(artmsEditions[1]?.rewards.map((r) => r.collectionNo)).toEqual([
      "203",
      "204",
    ]);
  });

  it("pools A and Z variants together and prefers the Z slug", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: [
        ...range(101, 108).map((no) =>
          catalogRow("Atom02", "SeoYeon", "First", `${no}Z`),
        ),
        catalogRow("Atom02", "SeoYeon", "First", "101A"),
      ],
      owned: [
        ownedRow("Atom02", "SeoYeon", "First", "101Z", true),
        ownedRow("Atom02", "SeoYeon", "First", "101A", true, 2),
        ownedRow("Atom02", "SeoYeon", "First", "101A", false),
      ],
    });

    const pool = ledger.members[0]?.seasons[0]?.editions[0]?.numbers.find(
      (n) => n.collectionNo === "101",
    );
    expect(pool?.usable).toBe(3);
    expect(pool?.total).toBe(4);
    expect(pool?.slug).toBe("atom02-seoyeon-101z");
  });

  it("counts only transferable copies as usable and everything as total", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: fullSeasonCatalog("Atom02", "SeoYeon"),
      owned: [
        ownedRow("Atom02", "SeoYeon", "First", "101Z", true, 2),
        ownedRow("Atom02", "SeoYeon", "First", "101Z", false, 3),
      ],
    });

    const pool = ledger.members[0]?.seasons[0]?.editions[0]?.numbers.find(
      (n) => n.collectionNo === "101",
    );
    expect(pool?.usable).toBe(2);
    expect(pool?.total).toBe(5);
  });

  it("computes completable as the minimum usable across the edition", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: fullSeasonCatalog("Atom02", "SeoYeon"),
      owned: range(101, 108).map((no) =>
        ownedRow(
          "Atom02",
          "SeoYeon",
          "First",
          `${no}Z`,
          true,
          no === "105" ? 1 : 3,
        ),
      ),
    });

    const edition = ledger.members[0]?.seasons[0]?.editions[0];
    expect(edition?.completable).toBe(1);
    expect(edition?.deficits).toEqual([
      { collectionNo: "105", slug: "atom02-seoyeon-105z" },
    ]);
  });

  it("lists every number as a deficit when all pools are level", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: fullSeasonCatalog("Atom02", "SeoYeon"),
      owned: range(101, 108).map((no) =>
        ownedRow("Atom02", "SeoYeon", "First", `${no}Z`, true, 2),
      ),
    });

    const edition = ledger.members[0]?.seasons[0]?.editions[0];
    expect(edition?.completable).toBe(2);
    expect(edition?.deficits).toHaveLength(8);
  });

  it("counts Z-designation rewards regardless of transferability, ignoring A copies", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: fullSeasonCatalog("Atom02", "SeoYeon"),
      owned: [
        ownedRow("Atom02", "SeoYeon", "Special", "201Z", true, 1),
        ownedRow("Atom02", "SeoYeon", "Special", "201Z", false, 2),
        ownedRow("Atom02", "SeoYeon", "Special", "201A", true, 5),
      ],
    });

    const rewards = ledger.members[0]?.seasons[0]?.editions[0]?.rewards;
    expect(rewards?.[0]?.owned).toBe(3);
    expect(rewards?.[1]?.owned).toBe(0);
    expect(rewards?.[0]?.slug).toBe("atom02-seoyeon-201z");
  });

  it("never surfaces event Specials as rewards", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: [
        ...fullSeasonCatalog("Divine01", "SeoYeon"),
        catalogRow("Divine01", "SeoYeon", "Special", "207Z"),
      ],
      owned: [
        ownedRow("Divine01", "SeoYeon", "First", "101Z", true),
        ownedRow("Divine01", "SeoYeon", "Special", "207Z", true, 4),
      ],
    });

    const editions = ledger.members[0]?.seasons[0]?.editions ?? [];
    const rewardNos = editions.flatMap((e) =>
      e.rewards.map((r) => r.collectionNo),
    );
    expect(rewardNos).not.toContain("207");
  });

  it("ignores tripleS Unit collections entirely", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: [
        ...fullSeasonCatalog("Cream02", "SeoYeon"),
        catalogRow("Cream02", "S1 X S9", "Unit", "601A"),
        catalogRow("Cream02", "S1 X S9", "Unit", "602Z"),
      ],
      owned: [
        ownedRow("Cream02", "SeoYeon", "First", "101Z", true),
        ownedRow("Cream02", "S1 X S9", "Unit", "601A", false),
      ],
    });

    expect(ledger.units).toBeNull();
    expect(ledger.members.map((member) => member.member)).toEqual(["SeoYeon"]);
  });

  it("does not make a season relevant from event Specials alone", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: [
        ...fullSeasonCatalog("Divine01", "SeoYeon"),
        catalogRow("Divine01", "SeoYeon", "Special", "207Z"),
      ],
      owned: [ownedRow("Divine01", "SeoYeon", "Special", "207Z", true, 4)],
    });

    expect(ledger.members).toHaveLength(0);
  });

  it("drops member/season groups with no relevant owned objekts", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: [
        ...fullSeasonCatalog("Atom02", "SeoYeon"),
        ...fullSeasonCatalog("Atom02", "JinSoul"),
        ...fullSeasonCatalog("Binary02", "SeoYeon"),
      ],
      owned: [ownedRow("Atom02", "SeoYeon", "First", "101Z", true)],
    });

    expect(ledger.members).toHaveLength(1);
    expect(ledger.members[0]?.member).toBe("SeoYeon");
    expect(ledger.members[0]?.seasons.map((s) => s.season)).toEqual(["Atom02"]);
  });

  it("sorts members by canonical order and seasons newest first", () => {
    const ledger = build({
      artist: "artms",
      catalog: [
        ...fullSeasonCatalog("Atom01", "JinSoul"),
        ...fullSeasonCatalog("Binary01", "JinSoul"),
        ...fullSeasonCatalog("Atom01", "HeeJin"),
      ],
      owned: [
        ownedRow("Atom01", "JinSoul", "First", "101Z", true),
        ownedRow("Binary01", "JinSoul", "First", "101Z", true),
        ownedRow("Atom01", "HeeJin", "First", "101Z", true),
      ],
    });

    expect(ledger.members.map((member) => member.member)).toEqual([
      "HeeJin",
      "JinSoul",
    ]);
    expect(ledger.members[1]?.seasons.map((s) => s.season)).toEqual([
      "Binary01",
      "Atom01",
    ]);
  });

  it("attaches non-transferable tokens to their number pool sorted by serial", () => {
    const ledger = build({
      artist: "tripleS",
      catalog: fullSeasonCatalog("Atom02", "SeoYeon"),
      owned: [ownedRow("Atom02", "SeoYeon", "First", "101Z", false, 2)],
      nonTransferableTokens: [
        token("Atom02", "SeoYeon", "101A", "9002", 42),
        token("Atom02", "SeoYeon", "101Z", "9001", 7),
      ],
    });

    const pool = ledger.members[0]?.seasons[0]?.editions[0]?.numbers.find(
      (n) => n.collectionNo === "101",
    );
    expect(pool?.usable).toBe(0);
    expect(pool?.nonTransferable).toEqual([
      { tokenId: "9001", serial: 7, collectionNo: "101Z" },
      { tokenId: "9002", serial: 42, collectionNo: "101A" },
    ]);
  });
});

describe("idntt units", () => {
  const idnttCatalog = [
    ...["DoHun", "HeeJu", "TaeIn"].flatMap((member) => [
      ...range(101, 108).map((no) =>
        catalogRow("Summer25", member, "Basic", `${no}Z`),
      ),
      catalogRow("Summer25", member, "Special", "301Z"),
      catalogRow("Summer25", member, "Special", "302Z"),
    ]),
    catalogRow("Summer25", "id1 X id2", "Unit", "401Z"),
    catalogRow("Summer25", "id1 X id4", "Unit", "401Z"),
    catalogRow("Summer25", "id2 X id4", "Unit", "401Z"),
  ];

  it("builds capacities, pairs, and maxUnits from spendable specials", () => {
    const ledger = build({
      artist: "idntt",
      catalog: idnttCatalog,
      owned: [
        // DoHun: 2 transferable 301Z + 1 non-transferable 302Z
        ownedRow("Summer25", "DoHun", "Special", "301Z", true, 2),
        ownedRow("Summer25", "DoHun", "Special", "302Z", false, 1),
        // HeeJu: 1 transferable 302Z
        ownedRow("Summer25", "HeeJu", "Special", "302Z", true, 1),
        // owned unit for DoHun X HeeJu
        ownedRow("Summer25", "id1 X id2", "Unit", "401Z", false, 1),
      ],
    });

    expect(ledger.units).toHaveLength(1);
    const season = ledger.units?.[0];
    expect(season?.season).toBe("Summer25");

    const doHun = season?.capacities.find((c) => c.member === "DoHun");
    expect(doHun?.spendable).toBe(2);
    // one 301Z spendable after keeping a copy; the non-transferable 302Z is its own keeper
    expect(doHun?.spendableSafe).toBe(1);
    expect(doHun?.ownedUnits).toBe(1);

    const heeJu = season?.capacities.find((c) => c.member === "HeeJu");
    expect(heeJu?.spendable).toBe(1);
    expect(heeJu?.spendableSafe).toBe(0);

    expect(season?.maxUnits).toBe(1);

    const pairs = new Map(
      season?.pairs.map((p) => [p.members.join("+"), p]) ?? [],
    );
    expect(pairs.get("DoHun+HeeJu")?.owned).toBe(1);
    expect(pairs.get("DoHun+HeeJu")?.achievable).toBe(true);
    expect(pairs.get("DoHun+TaeIn")?.achievable).toBe(false);
    expect(pairs.get("HeeJu+TaeIn")?.achievable).toBe(false);
  });

  it("falls back to the raw alias when a member reference is missing", () => {
    const ledger = build({
      artist: "idntt",
      catalog: [
        ...idnttCatalog,
        catalogRow("Summer25", "id1 X id99", "Unit", "401Z"),
      ],
      owned: [ownedRow("Summer25", "id1 X id99", "Unit", "401Z", false, 1)],
    });

    const pair = ledger.units?.[0]?.pairs.find((p) =>
      p.members.includes("id99"),
    );
    expect(pair?.members).toEqual(["DoHun", "id99"]);
  });

  it("uses idntt rewards 301/302 on the Basic edition", () => {
    const ledger = build({
      artist: "idntt",
      catalog: idnttCatalog,
      owned: [ownedRow("Summer25", "DoHun", "Basic", "101Z", true)],
    });

    const editions = ledger.members[0]?.seasons[0]?.editions ?? [];
    expect(editions.map((e) => e.edition)).toEqual([1]);
    expect(editions[0]?.rewards.map((r) => r.collectionNo)).toEqual([
      "301",
      "302",
    ]);
  });
});

describe("applyGridOverrides", () => {
  const input: GridLedgerInput = {
    artist: "tripleS",
    catalog: fullSeasonCatalog("Atom02", "SeoYeon"),
    owned: [
      ...range(102, 108).map((no) =>
        ownedRow("Atom02", "SeoYeon", "First", `${no}Z`, true),
      ),
      ownedRow("Atom02", "SeoYeon", "First", "101Z", false),
    ],
    nonTransferableTokens: [token("Atom02", "SeoYeon", "101Z", "9001", 7)],
    memberOrder: memberRefs,
  };

  it("counts included tokens as usable and recomputes completion", () => {
    const ledger = buildGridLedger(input);
    const before = ledger.members[0]?.seasons[0]?.editions[0];
    expect(before?.completable).toBe(0);
    expect(before?.deficits).toEqual([
      { collectionNo: "101", slug: "atom02-seoyeon-101z" },
    ]);

    const adjusted = applyGridOverrides(ledger, new Set(["9001"]));
    const after = adjusted.members[0]?.seasons[0]?.editions[0];
    expect(after?.completable).toBe(1);
    expect(after?.numbers.find((n) => n.collectionNo === "101")?.usable).toBe(
      1,
    );
    expect(after?.deficits).toHaveLength(8);
  });

  it("ignores unknown token ids and returns the same ledger when empty", () => {
    const ledger = buildGridLedger(input);
    expect(applyGridOverrides(ledger, new Set())).toBe(ledger);

    const adjusted = applyGridOverrides(ledger, new Set(["nope"]));
    expect(adjusted.members[0]?.seasons[0]?.editions[0]?.completable).toBe(0);
  });
});

describe("computeMaxUnits", () => {
  it("bounds units by pairing capacity", () => {
    expect(computeMaxUnits([])).toBe(0);
    expect(computeMaxUnits([5])).toBe(0);
    expect(computeMaxUnits([1, 1])).toBe(1);
    expect(computeMaxUnits([3, 1])).toBe(1);
    expect(computeMaxUnits([2, 2, 2])).toBe(3);
    expect(computeMaxUnits([5, 1, 1])).toBe(2);
  });
});
