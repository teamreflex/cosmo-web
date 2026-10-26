import { describe, expect, it } from "bun:test";
import {
  decideRow,
  parseOutboxRow,
  planBatch,
  type OutboxRow,
  type RawOutboxRow,
} from "../src/outbox";

const ALICE = "0x000000000000000000000000000000000000aaaa";
const BOB = "0x000000000000000000000000000000000000bbbb";
const TRANSFER_ID = "0d4c2f7e-5b1a-4c8e-9f3d-2a6b7c8d9e0f";
const HASH = "0xabc";
const BASE = Date.parse("2026-10-10T12:00:00Z");

function at(minute: number) {
  return new Date(BASE + minute * 60_000);
}

function transfer(id: number, tokenId: string, minute: number): OutboxRow {
  return {
    type: "transfer",
    id: BigInt(id),
    tokenId,
    hash: HASH,
    from: ALICE,
    to: BOB,
    timestamp: at(minute),
  };
}

function transferability(
  id: number,
  tokenId: string,
  minute: number,
  transferable = false,
): OutboxRow {
  return {
    type: "transferability",
    id: BigInt(id),
    tokenId,
    transferable,
    timestamp: at(minute),
  };
}

function raw(overrides: Partial<RawOutboxRow>): RawOutboxRow {
  return {
    id: 1n,
    type: "transfer",
    tokenId: "100",
    transferId: TRANSFER_ID,
    fromAddress: ALICE,
    toAddress: BOB,
    transferable: null,
    timestamp: at(0),
    hash: HASH,
    ...overrides,
  };
}

describe("parseOutboxRow", () => {
  // OUT-01
  it("parses a transfer row with the hash of its indexer transfer row", () => {
    expect(parseOutboxRow(raw({}))).toEqual({
      type: "transfer",
      id: 1n,
      tokenId: "100",
      hash: HASH,
      from: ALICE,
      to: BOB,
      timestamp: at(0),
    });
  });

  it("parses a transfer whose transfer row was rolled back without a hash", () => {
    expect(parseOutboxRow(raw({ hash: null }))).toMatchObject({
      type: "transfer",
      hash: null,
    });
  });

  // OUT-01
  it("parses a transferability row, which has no transfer row", () => {
    expect(
      parseOutboxRow(
        raw({
          type: "transferability",
          transferId: null,
          fromAddress: null,
          toAddress: null,
          transferable: false,
          hash: null,
        }),
      ),
    ).toEqual({
      type: "transferability",
      id: 1n,
      tokenId: "100",
      transferable: false,
      timestamp: at(0),
    });
  });

  // OUT-02
  it("rejects a transfer row without a transfer id", () => {
    expect(parseOutboxRow(raw({ transferId: null }))).toBeUndefined();
  });

  it("rejects a transfer row without addresses", () => {
    expect(parseOutboxRow(raw({ fromAddress: null }))).toBeUndefined();
    expect(parseOutboxRow(raw({ toAddress: null }))).toBeUndefined();
  });

  it("rejects a transferability row without a flag", () => {
    expect(
      parseOutboxRow(
        raw({
          type: "transferability",
          transferId: null,
          fromAddress: null,
          toAddress: null,
        }),
      ),
    ).toBeUndefined();
  });
});

describe("decideRow", () => {
  it("clears the token of a transfer", () => {
    expect(decideRow(transfer(1, "100", 0))).toEqual({
      type: "clear",
      tokenId: "100",
    });
  });

  it("does nothing for a transferability change either way", () => {
    expect(decideRow(transferability(1, "100", 0, false))).toEqual({
      type: "none",
    });
    expect(decideRow(transferability(1, "100", 0, true))).toEqual({
      type: "none",
    });
  });
});

describe("planBatch", () => {
  it("leaves the cursor alone for an empty batch", () => {
    expect(planBatch([])).toBeUndefined();
  });

  it("advances to the last row and clears each transferred token once, in order", () => {
    const plan = planBatch([
      transfer(10, "300", 0),
      transfer(11, "100", 1),
      transfer(12, "300", 2),
      transfer(13, "200", 3),
    ]);
    expect(plan).toEqual({
      seq: 13n,
      chainTime: at(3),
      clearTokenIds: ["300", "100", "200"],
      transfers: 4,
      transferabilityChanges: 0,
    });
  });

  it("clears nothing for transferability rows but still moves the cursor and chain time", () => {
    const plan = planBatch([
      transferability(20, "100", 5),
      transferability(21, "200", 6, true),
    ]);
    expect(plan).toEqual({
      seq: 21n,
      chainTime: at(6),
      clearTokenIds: [],
      transfers: 0,
      transferabilityChanges: 2,
    });
  });

  it("clears only the transferred tokens of a mixed batch", () => {
    const plan = planBatch([
      transfer(30, "100", 0),
      transferability(31, "200", 1),
      transfer(32, "300", 2),
    ]);
    expect(plan?.clearTokenIds).toEqual(["100", "300"]);
    expect(plan?.transfers).toBe(2);
    expect(plan?.transferabilityChanges).toBe(1);
  });

  it("keeps the newest chain time when a later row carries an older timestamp", () => {
    const plan = planBatch([
      transfer(40, "100", 9),
      transferability(41, "200", 4),
      transfer(42, "300", 7),
    ]);
    expect(plan?.seq).toBe(42n);
    expect(plan?.chainTime).toEqual(at(9));
  });
});
