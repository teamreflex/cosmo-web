import { describe, expect, test } from "bun:test";
import { Redacted, Schema } from "effect";
import { MAX_MESSAGE_LENGTH, MessageBody } from "../src/items";
import { sanitizeMessage } from "../src/sanitize";

// built from code points, so the source shows no invisible characters
const chars = (...codePoints: number[]) => String.fromCodePoint(...codePoints);
const RLO = chars(0x202e);

describe("sanitizeMessage", () => {
  test.each([
    ["an override", `pay ${RLO}emit${chars(0x202c)} now`, "pay emit now"],
    [
      "isolates and marks",
      `${chars(0x2066)}a${chars(0x2069, 0x200e)}b${chars(0x200f, 0x061c)}`,
      "ab",
    ],
    [
      "control characters",
      `a${chars(0)}b${chars(7)}c${chars(0x7f)}d${chars(0x85)}e`,
      "abcde",
    ],
    ["surrounding whitespace", "  hi  \n", "hi"],
  ])("strips %s", (_label, input, expected) => {
    expect(sanitizeMessage(input)).toBe(expected);
  });

  test("keeps newlines, tabs, CJK and emoji", () => {
    const text = `line one\nline\ttwo ${chars(0xc548, 0xb155)} ${chars(0x1faf6)}`;
    expect(sanitizeMessage(text)).toBe(text);
  });

  test.each([
    ["zero-width spaces", chars(0x200b, 0x200b)],
    ["a zero-width joiner and a soft hyphen", ` ${chars(0x200d, 0xad)} `],
    ["Hangul fillers", chars(0x3164, 0x115f, 0x1160, 0xffa0)],
    ["the blank Braille pattern", `${chars(0x2800)}\n${chars(0x2800)}`],
    ["format characters among bidi controls", `${RLO}${chars(0xfeff)}`],
  ])("empties text of only %s", (_label, input) => {
    expect(sanitizeMessage(input)).toBe("");
  });

  test.each([
    // man, woman, girl joined by zero-width joiners into one family emoji
    ["a joined emoji", chars(0x1f468, 0x200d, 0x1f469, 0x200d, 0x1f467)],
    // Persian "mikhaham", whose zero-width non-joiner keeps mi apart
    [
      "a zero-width non-joiner in a word",
      chars(0x645, 0x6cc, 0x200c, 0x62e, 0x648, 0x627, 0x647, 0x645),
    ],
  ])("keeps %s", (_label, text) => {
    expect(sanitizeMessage(text)).toBe(text);
  });
});

describe("MessageBody", () => {
  const decode = (text: string) =>
    Schema.decodeUnknownExit(MessageBody)(Redacted.make(text));

  test("decodes sanitised and redacted", () => {
    const exit = decode(` hi ${RLO}`);
    expect(exit._tag).toBe("Success");
    if (exit._tag === "Success") {
      expect(Redacted.value(exit.value)).toBe("hi");
      expect(Bun.inspect(exit.value)).not.toContain("hi");
    }
  });

  test.each([
    ["empty", ""],
    ["only whitespace and controls", ` ${RLO}${chars(0)} `],
    ["only a zero-width space", chars(0x200b)],
    ["over the limit", "a".repeat(MAX_MESSAGE_LENGTH + 1)],
  ])("refuses a body that is %s", (_label, input) => {
    expect(decode(input)._tag).toBe("Failure");
  });

  test("accepts exactly the limit", () => {
    expect(decode("a".repeat(MAX_MESSAGE_LENGTH))._tag).toBe("Success");
  });

  test("a refusal never prints the text", () => {
    const exit = decode("secret-canary".repeat(100));
    expect(Bun.inspect(exit)).not.toContain("secret-canary");
  });
});
