import { Addresses } from "@apollo/util";
import { describe, expect, it } from "bun:test";
import {
  chainTransfers,
  groupTransfers,
  pairSpins,
  tradedIds,
} from "../src/lib/universal/transfer-grouping";
import type {
  TransferObjekt,
  TransferRow,
} from "../src/lib/universal/transfers";

const OWNER = "0x000000000000000000000000000000000000aaaa";
const ALICE = "0x000000000000000000000000000000000000bbbb";
const BOB = "0x000000000000000000000000000000000000cccc";
const BASE = Date.parse("2026-10-06T12:00:00Z");

function transfer(
  id: string,
  minute: number,
  from: string,
  to: string,
): TransferObjekt {
  return {
    transfer: {
      id,
      hash: `0x${id}`,
      from,
      to,
      timestamp: new Date(BASE + minute * 60_000).toISOString(),
      tokenId: 1,
      objektId: id,
      collectionId: "collection",
    },
    serial: null,
    collection: null,
  };
}

function group(
  page: TransferObjekt[],
  overrides: Partial<Parameters<typeof groupTransfers>[0]> = {},
): TransferRow[] {
  const related = overrides.related ?? page;
  return groupTransfers({
    address: OWNER,
    page,
    rewards: new Map(),
    rewardIds: new Set(),
    related,
    inStream: new Set(related.map((t) => t.transfer.id)),
    now: BASE + 60 * 60_000,
    ...overrides,
  });
}

const kinds = (rows: TransferRow[]) => rows.map((r) => `${r.kind}:${r.id}`);

describe("groupTransfers", () => {
  it("folds a two-way exchange into one trade at its newest transfer", () => {
    const sent = transfer("s1", 0, OWNER, ALICE);
    const got1 = transfer("r1", 3, ALICE, OWNER);
    const got2 = transfer("r2", 5, ALICE, OWNER);
    const rows = group([got2, got1, sent]);

    expect(kinds(rows)).toEqual(["trade:r2"]);
    const [trade] = rows;
    expect(
      trade?.kind === "trade" && [trade.sent.length, trade.received.length],
    ).toEqual([1, 2]);
  });

  it("keeps transfers more than 15 minutes apart as separate rows", () => {
    const rows = group([
      transfer("r1", 40, ALICE, OWNER),
      transfer("s1", 0, OWNER, ALICE),
    ]);
    expect(kinds(rows)).toEqual(["received:r1", "sent:s1"]);
  });

  it("never pairs transfers with different users", () => {
    const rows = group([
      transfer("s1", 3, OWNER, BOB),
      transfer("r1", 0, ALICE, OWNER),
    ]);
    expect(kinds(rows)).toEqual(["sent:s1", "received:r1"]);
  });

  it("chains a batch through gaps under 15 minutes each", () => {
    const rows = group([
      transfer("r3", 28, ALICE, OWNER),
      transfer("r2", 14, ALICE, OWNER),
      transfer("r1", 0, ALICE, OWNER),
    ]);
    expect(kinds(rows)).toEqual(["received:r3"]);
  });

  it("skips a trade transfer whose newer half rendered on an earlier page", () => {
    const newer = transfer("r1", 5, ALICE, OWNER);
    const older = transfer("s1", 0, OWNER, ALICE);
    const rows = group([older], { related: [newer, older] });
    expect(rows).toEqual([]);
  });

  it("anchors at the newest transfer matching the filter", () => {
    const got = transfer("r1", 5, ALICE, OWNER);
    const sent = transfer("s1", 0, OWNER, ALICE);
    // only the sent transfer passes the active collection filter
    const rows = group([sent], {
      related: [got, sent],
      inStream: new Set(["s1"]),
    });
    expect(kinds(rows)).toEqual(["trade:s1"]);
  });

  it("puts spin rewards inside their spin and hides them as mints", () => {
    const spin = transfer("spin", 0, OWNER, Addresses.SPIN);
    const reward = transfer("reward", 0.25, Addresses.NULL, OWNER);
    const purchase = transfer("buy", 30, Addresses.NULL, OWNER);
    const rows = group([purchase, reward, spin], {
      rewards: new Map([["spin", reward]]),
      rewardIds: new Set(["reward"]),
    });

    expect(kinds(rows)).toEqual(["mint:buy", "spin:spin"]);
    const spinRow = rows[1];
    expect(spinRow?.kind === "spin" && spinRow.outcome).toBe("success");
  });

  it("marks a spin without a reward pending, then failed", () => {
    const spin = transfer("spin", 0, OWNER, Addresses.SPIN);
    const outcome = (now: number) => {
      const [row] = group([spin], { now });
      return row?.kind === "spin" ? row.outcome : null;
    };

    expect(outcome(BASE + 30_000)).toBe("pending");
    expect(outcome(BASE + 5 * 60_000)).toBe("fail");
  });
});

describe("tradedIds", () => {
  it("covers every transfer in a chain that went both ways", () => {
    const transfers = [
      transfer("s1", 0, OWNER, ALICE),
      transfer("s2", 14, OWNER, ALICE),
      transfer("r1", 28, ALICE, OWNER),
      transfer("s3", 0, OWNER, BOB),
    ];
    const traded = tradedIds(OWNER, chainTransfers(OWNER, transfers));
    expect([...traded].toSorted()).toEqual(["r1", "s1", "s2"]);
  });
});

describe("pairSpins", () => {
  const spinAt = (id: string, second: number) =>
    transfer(id, second / 60, OWNER, Addresses.SPIN);
  const mintAt = (id: string, second: number) =>
    transfer(id, second / 60, Addresses.NULL, OWNER);

  it("pairs each spin with the first mint shortly after it", () => {
    const pairs = pairSpins(
      [spinAt("s1", 0), spinAt("s2", 30)],
      [mintAt("m1", 15), mintAt("m2", 46)],
    );
    expect([...pairs]).toEqual([
      ["s1", "m1"],
      ["s2", "m2"],
    ]);
  });

  it("leaves a failed spin unpaired when the next spin wins", () => {
    const pairs = pairSpins(
      [spinAt("lost", 0), spinAt("won", 30)],
      [mintAt("m1", 45)],
    );
    expect([...pairs]).toEqual([["won", "m1"]]);
  });

  it("ignores mints sooner than the reward delay or past the window", () => {
    const pairs = pairSpins(
      [spinAt("s1", 0), spinAt("s2", 300)],
      [mintAt("same-moment", 301), mintAt("late", 500)],
    );
    expect(pairs.size).toBe(0);
  });
});
