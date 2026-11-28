import { describe, expect, test } from "bun:test";
import { substituteSource } from "../src/lib/universal/trades";

const sender = "0xA5848873c7aB6189989dD8534EECf4295b00A98d";

describe("substituteSource", () => {
  test("a copy from the sender's pinned address, whatever its case", () => {
    expect(substituteSource(sender.toLowerCase(), sender, new Map())).toEqual({
      kind: "sender",
    });
  });

  test("a copy from another address someone linked", () => {
    expect(
      substituteSource(
        "0x8F3C000000000000000000000000000000a1d2",
        sender,
        new Map([
          ["0x8f3c000000000000000000000000000000a1d2", { username: "alt" }],
        ]),
      ),
    ).toEqual({
      kind: "known",
      username: "alt",
    });
  });

  test("a copy from an address nobody linked", () => {
    expect(
      substituteSource(
        "0x51b70000000000000000000000000000000009ce",
        sender,
        new Map(),
      ),
    ).toEqual({
      kind: "unknown",
      address: "0x51b70000000000000000000000000000000009ce",
    });
  });

  test("a trade missing the sender's address names the source by address", () => {
    expect(substituteSource(sender, null, new Map())).toEqual({
      kind: "unknown",
      address: sender.toLowerCase(),
    });
  });
});
