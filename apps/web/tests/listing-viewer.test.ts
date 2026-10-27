import type { TradeWant } from "@apollo/trades/allocate";
import type { TokenFlags } from "@apollo/trades/holdings";
import type { ObjektAttributes, RangeFilter } from "@apollo/trades/range";
import { describe, expect, test } from "bun:test";
import {
  askingTitle,
  standingsSummary,
  wantKindsSummary,
  wantLabel,
} from "../src/lib/client/trade-listings";
import {
  type Candidate,
  candidatePanel,
  hasRatio,
  isLiveTrade,
  type ListingFeedItem,
  type ListingItem,
  type ListingOfferSummary,
  listingStop,
  type ListingTrade,
  liveHolder,
  type OfferRefusal,
  offerRefusal,
  offerRefusalError,
  type PoolAvailability,
  poolAvailability,
  poolStanding,
  posterTabCounts,
  refusedOfferToken,
  shownPosterTab,
  takenPick,
  toggleOffered,
} from "../src/lib/universal/trade-listings";
import type { TradeParty } from "../src/lib/universal/trades";

const poster = "0x00000000000000000000000000000000000000aa";
const claimer = "0x00000000000000000000000000000000000000bb";
const noFlags: TokenFlags = { locked: new Set(), live: new Set() };

const attributes = (slug: string, member = "HeeJin"): ObjektAttributes => ({
  slug,
  artist: "artms",
  member,
  season: "Atom02",
  class: "First",
  onOffline: "online",
});

const held = (
  tokenId: number,
  owner: string,
  slug = "atom02-heejin-101z",
  transferable = true,
) => ({
  kind: "found" as const,
  tokenId,
  owner,
  transferable,
  // a slug ends with its collection number, lowercased
  attributes: {
    ...attributes(slug),
    collectionNo: slug.slice(slug.lastIndexOf("-") + 1).toUpperCase(),
  },
});

describe("pool availability", () => {
  const judge = (
    item: { tokenId: number; leftAt: Date | null },
    state: ReturnType<typeof held> | undefined,
    flags = noFlags,
  ) => poolAvailability(item, state, poster, flags).kind;

  test("a row that left the pool is traded, whatever the token does now", () => {
    expect(
      poolAvailability(
        { tokenId: 1, leftAt: new Date(5) },
        held(1, poster),
        poster,
        noFlags,
      ),
    ).toEqual({ kind: "traded", at: new Date(5) });
  });

  test("a token the poster can give is free", () => {
    expect(judge({ tokenId: 1, leftAt: null }, held(1, poster))).toBe("free");
  });

  test("a live token is in a trade even once it has moved on its way", () => {
    expect(
      judge({ tokenId: 1, leftAt: null }, held(1, claimer), {
        locked: new Set(),
        live: new Set([1]),
      }),
    ).toBe("in_trade");
  });

  test("a token the poster can't give is blocked with why", () => {
    const blocked = (
      state: ReturnType<typeof held> | undefined,
      flags = noFlags,
    ) => poolAvailability({ tokenId: 1, leftAt: null }, state, poster, flags);
    expect(blocked(held(1, claimer))).toEqual({
      kind: "blocked",
      reason: "moved",
    });
    expect(blocked(undefined)).toEqual({ kind: "blocked", reason: "moved" });
    expect(blocked(held(1, poster, "atom02-heejin-101z", false))).toEqual({
      kind: "blocked",
      reason: "untransferable",
    });
    expect(
      blocked(held(1, poster), { locked: new Set([1]), live: new Set() }),
    ).toEqual({ kind: "blocked", reason: "locked" });
  });
});

describe("picking from the pool", () => {
  test("a tap takes a pick out, adds one while there's room, or swaps out the earliest", () => {
    expect(toggleOffered([3, 5], 5, 2)).toEqual([3]);
    expect(toggleOffered([3], 6, 2)).toEqual([3, 6]);
    expect(toggleOffered([3, 6], 8, 2)).toEqual([6, 8]);
    expect(toggleOffered([3], 6, 1)).toEqual([6]);
  });

  test("an offer's pick is taken once another trade holds it or it left the pool", () => {
    const item = (
      tokenId: number,
      availability: PoolAvailability,
    ): Pick<ListingItem, "tokenId" | "availability"> => ({
      tokenId,
      availability,
    });
    const listing = {
      items: [
        item(1, { kind: "free" }),
        item(2, { kind: "in_trade" }),
        item(3, { kind: "traded", at: new Date(0) }),
        item(4, { kind: "blocked", reason: "locked" }),
        // left in a trade, then offered again in an edit
        item(5, { kind: "traded", at: new Date(0) }),
        item(5, { kind: "free" }),
      ],
    };
    const picks = (...tokenIds: number[]) =>
      tokenIds.map((tokenId) => ({ tokenId }));

    expect(takenPick(picks(1, 4, 5), listing)).toBeNull();
    expect(takenPick(picks(1, 2), listing)).toEqual({ tokenId: 2 });
    expect(takenPick(picks(3, 2), listing)).toEqual({ tokenId: 3 });
  });
});

describe("whether the poster can accept an offer", () => {
  const wants: TradeWant[] = [
    { kind: "exact", count: 1, slug: "atom02-kimlip-101z" },
  ];
  const now = new Date("2026-10-26T00:00:00Z");
  const states = new Map([
    [1, held(1, poster, "atom02-heejin-101z")],
    [2, held(2, poster, "atom02-heejin-102z")],
    [10, held(10, claimer, "atom02-kimlip-101z")],
    [11, held(11, claimer, "atom02-kimlip-101z")],
  ]);
  const judge = ({
    offer = {},
    listing = {},
    side = {},
    tokens = {},
  }: {
    offer?: Partial<Parameters<typeof offerRefusal>[0]>;
    listing?: Partial<Parameters<typeof offerRefusal>[1]>;
    side?: Partial<Parameters<typeof offerRefusal>[2]>;
    tokens?: Partial<Parameters<typeof offerRefusal>[3]>;
  }) =>
    offerRefusal(
      {
        expiresAt: new Date("2026-10-27T00:00:00Z"),
        picks: [1],
        given: [10],
        ...offer,
      },
      {
        fromAddress: poster,
        pool: new Set([1, 2]),
        unitSize: 1,
        wants,
        posterRefused: false,
        ...listing,
      },
      { address: claimer, linked: true, atCap: false, ...side },
      { states, poster: noFlags, claimer: noFlags, ...tokens },
      now,
    );

  test("an offer that still fits can be accepted", () => {
    expect(judge({})).toBeNull();
    expect(judge({ offer: { picks: [1, 2], given: [10, 11] } })).toBeNull();
  });

  test("each check answers as $acceptOffer would", () => {
    expect(judge({ offer: { expiresAt: now } })).toEqual({
      code: "offer_expired",
    });
    expect(judge({ listing: { pool: new Set([2]) } })).toEqual({
      code: "listing_updated",
    });
    expect(judge({ listing: { unitSize: 2 } })).toEqual({
      code: "listing_updated",
    });
    expect(judge({ offer: { given: [12] } })).toEqual({
      code: "offer_unavailable",
      tokenId: 12,
    });
    expect(judge({ listing: { posterRefused: true } })).toEqual({
      code: "cosmo_not_linked",
    });
    expect(
      judge({ tokens: { poster: { locked: new Set(), live: new Set([1]) } } }),
    ).toEqual({ code: "listing_pick_unavailable", tokenId: 1 });
    expect(
      judge({ tokens: { poster: { locked: new Set([1]), live: new Set() } } }),
    ).toEqual({
      code: "claim_token_unavailable",
      tokenId: 1,
      reason: "locked",
    });
    expect(judge({ side: { linked: false } })).toEqual({
      code: "offer_unavailable",
      tokenId: null,
    });
    expect(judge({ side: { atCap: true } })).toEqual({
      code: "offer_unavailable",
      tokenId: null,
    });
    expect(
      judge({
        tokens: { claimer: { locked: new Set(), live: new Set([10]) } },
      }),
    ).toEqual({ code: "offer_unavailable", tokenId: 10 });
  });

  test("a claimer token they can't give is named without why", () => {
    const given = (state: ReturnType<typeof held>, flags = noFlags) =>
      judge({
        tokens: { states: new Map([...states, [10, state]]), claimer: flags },
      });
    const named: OfferRefusal = { code: "offer_unavailable", tokenId: 10 };
    expect(given(held(10, poster, "atom02-kimlip-101z"))).toEqual(named);
    expect(given(held(10, claimer, "atom02-kimlip-101z", false))).toEqual(
      named,
    );
    expect(
      given(held(10, claimer, "atom02-kimlip-101z"), {
        locked: new Set([10]),
        live: new Set(),
      }),
    ).toEqual(named);
  });

  test("the first failing check wins, in $acceptOffer's order", () => {
    expect(
      judge({
        offer: { expiresAt: now },
        listing: { posterRefused: true },
        side: { atCap: true },
      }),
    ).toEqual({ code: "offer_expired" });
    expect(
      judge({ listing: { posterRefused: true }, side: { linked: false } }),
    ).toEqual({ code: "cosmo_not_linked" });
    expect(judge({ side: { linked: false, atCap: true } })).toEqual({
      code: "offer_unavailable",
      tokenId: null,
    });
    // a pick moved and live elsewhere is named for the move first
    expect(
      judge({
        offer: { picks: [2] },
        tokens: {
          states: new Map([...states, [2, held(2, claimer)]]),
          poster: { locked: new Set(), live: new Set([2]) },
        },
      }),
    ).toEqual({
      code: "claim_token_unavailable",
      tokenId: 2,
      reason: "not_owned",
    });
  });
});

describe("the error a refused accept throws", () => {
  const thrown = (refusal: OfferRefusal) => {
    const error = offerRefusalError(refusal);
    return { code: error.message, data: error.data };
  };

  test("a refusal naming nothing carries no data", () => {
    for (const code of [
      "offer_expired",
      "listing_updated",
      "cosmo_not_linked",
    ] as const) {
      expect(thrown({ code })).toEqual({ code, data: undefined });
    }
    expect(thrown({ code: "offer_unavailable", tokenId: null })).toEqual({
      code: "offer_unavailable",
      data: undefined,
    });
  });

  test("the claimer's token is named without why", () => {
    expect(thrown({ code: "offer_unavailable", tokenId: 10 })).toEqual({
      code: "offer_unavailable",
      data: { tokenId: 10 },
    });
  });

  test("the poster's pick is named, with why unless it's live elsewhere", () => {
    expect(thrown({ code: "listing_pick_unavailable", tokenId: 1 })).toEqual({
      code: "listing_pick_unavailable",
      data: { tokenId: 1 },
    });
    expect(
      thrown({
        code: "claim_token_unavailable",
        tokenId: 1,
        reason: "untransferable",
      }),
    ).toEqual({
      code: "claim_token_unavailable",
      data: { tokenId: 1, reason: "untransferable" },
    });
  });
});

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  role: "candidate",
  units: 1,
  rows: [{ owned: 1, missing: 0 }],
  claims: { active: 0, cap: 3 },
  ownAddress: false,
  endedOffer: null,
  ...overrides,
});

describe("what stops every claim", () => {
  const pool = (...kinds: PoolAvailability[]) =>
    kinds.map((availability) => ({ availability }));
  const free: PoolAvailability = { kind: "free" };
  const busy: PoolAvailability = { kind: "in_trade" };
  const locked: PoolAvailability = { kind: "blocked", reason: "locked" };

  test("nothing while a trade's worth of the pool is free", () => {
    expect(listingStop(pool(free, busy), 1, false)).toBeNull();
  });

  test("trades holding the rest of the pool make it busy, not blocked", () => {
    expect(listingStop(pool(busy, busy), 1, false)).toBe("busy");
    expect(listingStop(pool(free, busy, locked), 2, false)).toBe("busy");
  });

  test("objekts the poster can't give, or their account, block it", () => {
    expect(listingStop(pool(free, locked), 2, false)).toBe("blocked");
    expect(listingStop(pool(busy, locked, locked), 2, false)).toBe("blocked");
    expect(listingStop(pool(free, free), 1, true)).toBe("blocked");
  });

  test("objekts that left the pool count for nothing", () => {
    expect(
      listingStop(pool(free, { kind: "traded", at: new Date(0) }), 2, false),
    ).toBe("blocked");
  });
});

describe("whether a listing reads as a ratio", () => {
  test("a trade taking less than everything it ever offered is a ratio", () => {
    expect(hasRatio(2, 6)).toBe(true);
  });

  test("a pool down to one trade's worth keeps its ratio", () => {
    // posted three, two traded away, one left: the pool alone would read as a bundle
    expect(hasRatio(1, 3)).toBe(true);
    expect(hasRatio(2, 5)).toBe(true);
  });

  test("everything for everything, or a single objekt, is a bundle", () => {
    expect(hasRatio(3, 3)).toBe(false);
    expect(hasRatio(1, 1)).toBe(false);
  });
});

describe("what a candidate sees", () => {
  const listing = {
    wants: [{ kind: "exact" as const }],
    stop: null,
  };
  // a range row makes the listing take offers
  const offers = { ...listing, wants: [{ kind: "range" as const }] };

  test("the picker while a unit of the pool is free", () => {
    expect(candidatePanel(listing, candidate())).toBe("picker");
  });

  test("a pool all in trades is busy until one ends", () => {
    expect(candidatePanel({ ...listing, stop: "busy" }, candidate())).toBe(
      "busy",
    );
  });

  test("the poster's side stops it as blocked", () => {
    expect(candidatePanel({ ...listing, stop: "blocked" }, candidate())).toBe(
      "blocked",
    );
    expect(
      candidatePanel(
        { ...listing, wants: [{ kind: "exact" }, { kind: "payment" }] },
        candidate(),
      ),
    ).toBe("blocked");
  });

  test("the viewer's own address can't take it", () => {
    expect(candidatePanel(listing, candidate({ ownAddress: true }))).toBe(
      "blocked",
    );
  });

  test("the cap stops claims but not offers", () => {
    const capped = candidate({ claims: { active: 3, cap: 3 } });
    expect(candidatePanel(listing, capped)).toBe("cap");
    expect(candidatePanel(offers, capped)).toBe("picker");
  });

  test("the cap is said before the poster's side", () => {
    const capped = candidate({ claims: { active: 3, cap: 3 } });
    expect(candidatePanel({ ...listing, stop: "blocked" }, capped)).toBe("cap");
    expect(candidatePanel({ ...offers, stop: "blocked" }, capped)).toBe(
      "blocked",
    );
  });
});

const counterparty = (name: string): TradeParty => ({
  user: null,
  cosmoUsername: name,
  rep: null,
});

/**
 * A trade from the listing that took `tokenIds`, accepted at `acceptedAt`
 * and, once finished, ended at `endedAt` (both in ms).
 */
const trade = (
  status: ListingTrade["status"],
  name: string,
  tokenIds: number[],
  { acceptedAt = 0, endedAt = 0 } = {},
): ListingTrade => {
  const base = {
    tradeId: name,
    claimer: counterparty(name),
    acceptedAt: new Date(acceptedAt),
    tokenIds,
    givenCount: tokenIds.length,
  };
  switch (status) {
    case "accepted":
      return {
        ...base,
        status,
        deadlineAt: new Date(0),
        toSend: tokenIds.length,
        needsYou: true,
      };
    case "disputed":
      return {
        ...base,
        status,
        deadlineAt: new Date(0),
        dispute: null,
      };
    default:
      return { ...base, status, endedAt: new Date(endedAt) };
  }
};

describe("where the poster's objekts stand", () => {
  const stand = (
    availability: PoolAvailability,
    trades: ListingTrade[],
    tokenId = 1,
  ) => poolStanding({ tokenId, availability }, trades);
  const left = (at: number): PoolAvailability => ({
    kind: "traded",
    at: new Date(at),
  });

  test("an objekt in a live trade from the listing names its claimer", () => {
    expect(
      stand({ kind: "in_trade" }, [
        trade("completed", "soo", [1]),
        trade("disputed", "minji", [1, 2]),
      ]),
    ).toEqual({ kind: "in_trade", claimer: counterparty("minji") });
  });

  test("one live in a trade from elsewhere names nobody", () => {
    expect(
      stand({ kind: "in_trade" }, [trade("accepted", "minji", [2])]),
    ).toEqual({ kind: "in_trade", claimer: null });
  });

  test("a traded objekt names the claimer of the trade that took it", () => {
    expect(
      stand(left(50), [
        trade("cancelled", "yves", [1], { acceptedAt: 60, endedAt: 70 }),
        trade("completed", "soo", [1], { acceptedAt: 40, endedAt: 50 }),
        trade("completed", "chuu", [1], { acceptedAt: 10, endedAt: 20 }),
      ]),
    ).toEqual({ kind: "traded", claimer: counterparty("soo") });
  });

  test("one sent in a live trade names its claimer, not gone", () => {
    expect(
      stand(left(50), [trade("accepted", "minji", [1], { acceptedAt: 40 })]),
    ).toEqual({ kind: "sent", claimer: counterparty("minji") });
    expect(
      stand(left(50), [trade("disputed", "minji", [1], { acceptedAt: 40 })]),
    ).toEqual({ kind: "sent", claimer: counterparty("minji") });
  });

  test("traded, offered again in an edit, then moved, is gone", () => {
    const trades = [
      trade("completed", "soo", [1], { acceptedAt: 10, endedAt: 20 }),
    ];
    // the first row left in soo's trade, the second when the poster moved it
    expect(stand(left(20), trades)).toEqual({
      kind: "traded",
      claimer: counterparty("soo"),
    });
    expect(stand(left(90), trades)).toEqual({ kind: "gone" });
  });

  test("one that left the pool in no completed or live trade is gone", () => {
    expect(
      stand(left(50), [
        trade("timed_out", "yves", [1], { acceptedAt: 40, endedAt: 60 }),
      ]),
    ).toEqual({ kind: "gone" });
  });

  test("free and blocked objekts stand as they are", () => {
    expect(stand({ kind: "free" }, [])).toEqual({ kind: "free" });
    expect(stand({ kind: "blocked", reason: "locked" }, [])).toEqual({
      kind: "blocked",
      reason: "locked",
    });
  });
});

describe("the live trade holding a pool objekt", () => {
  test("an accepted or disputed trade holds its objekts", () => {
    const trades = [
      trade("accepted", "minji", [1]),
      trade("disputed", "soo", [2, 3]),
    ];
    expect(liveHolder(1, trades)?.tradeId).toBe("minji");
    expect(liveHolder(3, trades)?.tradeId).toBe("soo");
  });

  test("a finished trade holds nothing", () => {
    for (const status of ["completed", "cancelled", "timed_out"] as const) {
      expect(isLiveTrade(trade(status, "minji", [1]))).toBe(false);
      expect(liveHolder(1, [trade(status, "minji", [1])])).toBeUndefined();
    }
  });
});

describe("the objekt a refused offer names", () => {
  const item = (tokenId: number, serial: number | null): ListingFeedItem => ({
    tokenId,
    serial,
    attributes: attributes("atom02-heejin-101z"),
    collection: null,
  });
  const offer = { picks: [item(1, 21), item(2, null)], given: [item(10, 7)] };

  test("a refusal over the poster's side names one of their picks", () => {
    expect(
      refusedOfferToken(
        { code: "listing_pick_unavailable", tokenId: 1 },
        offer,
      ),
    ).toEqual({ ...item(1, 21), serial: 21 });
    expect(
      refusedOfferToken(
        { code: "claim_token_unavailable", tokenId: 1, reason: "locked" },
        offer,
      ),
    ).toEqual({ ...item(1, 21), serial: 21 });
  });

  test("offer_unavailable names the claimer's objekt", () => {
    expect(
      refusedOfferToken({ code: "offer_unavailable", tokenId: 10 }, offer),
    ).toEqual({ ...item(10, 7), serial: 7 });
    expect(
      refusedOfferToken({ code: "offer_unavailable", tokenId: 1 }, offer),
    ).toBeNull();
  });

  test("an objekt without a known serial, or no objekt, names none", () => {
    expect(
      refusedOfferToken(
        { code: "listing_pick_unavailable", tokenId: 2 },
        offer,
      ),
    ).toBeNull();
    expect(
      refusedOfferToken({ code: "offer_unavailable", tokenId: null }, offer),
    ).toBeNull();
    expect(refusedOfferToken({ code: "offer_expired" }, offer)).toBeNull();
  });
});

describe("the poster's tabs", () => {
  const poster = (offers: number, trades: ListingTrade[]) => ({
    offers: Array.from({ length: offers }, (): ListingOfferSummary => ({
      tradeId: "o",
      claimer: counterparty("x"),
      picks: [],
      given: [],
      expiresAt: new Date(0),
      refusal: null,
    })),
    trades,
  });

  test("Offers counts the pending offers and Trades only the live trades", () => {
    expect(
      posterTabCounts(
        { takesOffers: true },
        poster(2, [
          trade("accepted", "a", [1]),
          trade("disputed", "b", [2]),
          trade("completed", "c", [3]),
        ]),
      ),
    ).toEqual([
      { tab: "listing", count: 0 },
      { tab: "offers", count: 2 },
      { tab: "trades", count: 2 },
    ]);
  });

  test("a listing claimed at once has no Offers tab", () => {
    expect(
      posterTabCounts({ takesOffers: false }, poster(0, [])).map(
        ({ tab }) => tab,
      ),
    ).toEqual(["listing", "trades"]);
  });

  test("an offer still pending keeps the Offers tab", () => {
    expect(
      posterTabCounts({ takesOffers: false }, poster(1, [])).map(
        ({ tab }) => tab,
      ),
    ).toEqual(["listing", "offers", "trades"]);
  });

  test("the page opens on the tab the URL asks for while the listing has it", () => {
    const tabs = posterTabCounts({ takesOffers: false }, poster(0, []));
    expect(shownPosterTab("trades", tabs)).toBe("trades");
    expect(shownPosterTab("offers", tabs)).toBe("listing");
  });
});

describe("an any-of row's label", () => {
  const choice = (...options: [string, string][]) => ({
    kind: "choice" as const,
    count: 1,
    options: options.map(([slug, member]) => ({
      ...attributes(slug, member),
      collection: null,
    })),
  });

  test("counts its collections, whether or not they share a member", () => {
    expect(
      wantLabel(
        choice(
          ["atom02-kimlip-101z", "KimLip"],
          ["atom02-kimlip-102z", "KimLip"],
        ),
      ),
    ).toBe("Any of 2 collections");
    expect(
      wantLabel(
        choice(
          ["atom02-kimlip-101z", "KimLip"],
          ["atom02-heejin-102z", "HeeJin"],
        ),
      ),
    ).toBe("Any of 2 collections");
    expect(wantLabel(choice(["atom02-kimlip-101z", "KimLip"]))).toBe(
      "Any of 1 collection",
    );
  });

  test("the heading's summary counts any-of rows", () => {
    expect(
      wantKindsSummary([
        choice(["atom02-kimlip-101z", "KimLip"]),
        { kind: "payment", amount: "1", currency: "NZD" },
      ]),
    ).toBe("1 any of · 1 payment");
  });
});

describe("a feed row's asking title", () => {
  const range = (filter: Partial<RangeFilter>, count = 1) => ({
    kind: "range" as const,
    count,
    filter: {
      artist: [],
      member: [],
      collectionNo: [],
      season: [],
      class: [],
      on_offline: [],
      ...filter,
    },
  });

  test("one range reads as its narrowed values", () => {
    expect(
      askingTitle([
        range({ season: ["Atom02"], member: ["KimLip"], class: ["First"] }),
      ]),
    ).toBe("Atom02 · KimLip · First");
  });

  test("a range narrowed to one column names that column", () => {
    expect(askingTitle([range({ class: ["First"] })])).toBe("First");
    expect(askingTitle([range({ member: ["JinSoul", "JiWoo", "Lynn"] })])).toBe(
      "JinSoul / JiWoo / Lynn",
    );
  });

  test("several rows count what they ask for", () => {
    expect(
      askingTitle([
        range({ class: ["First"] }, 2),
        range({ class: ["Special"] }),
      ]),
    ).toBe("3 objekts");
  });
});

describe("how a listing's objekts stand", () => {
  test("the pool's availability sums up as the poster's standings do", () => {
    expect(
      standingsSummary([
        { kind: "free" },
        { kind: "in_trade" },
        { kind: "traded" },
        { kind: "traded" },
      ]),
    ).toBe("1 available · 1 in a trade · 2 traded");
  });
});
