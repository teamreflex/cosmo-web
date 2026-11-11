import { describe, expect, test } from "bun:test";
import { leaveFeedbackSchema } from "../src/lib/universal/schema/feedback";

// the comment a leave parses to, null for none, or undefined when it's refused
const comment = (text: string) => {
  const parsed = leaveFeedbackSchema.safeParse({
    tradeId: "7d0b4f7e-3c1a-4b8e-9f2d-6a5c4b3a2f10",
    rating: "positive",
    comment: text,
  });
  return parsed.success ? parsed.data.comment : undefined;
};

describe("PARSE-02: comment length and whitespace", () => {
  test("whitespace runs collapse to one space and the ends are trimmed", () => {
    expect(comment("  Great\n\n trade\t\tthanks  ")).toBe("Great trade thanks");
  });

  test("the limit applies after collapsing", () => {
    const padded = `${"a ".repeat(140).trim()}${" ".repeat(50)}`;
    expect(comment(padded)).toHaveLength(279);
  });
});

describe("PARSE-03: length counts code points, as varchar(280) does", () => {
  const emoji = "😀";

  test("280 astral emoji pass although their UTF-16 length is 560", () => {
    const text = emoji.repeat(280);
    expect(text.length).toBe(560);
    expect(comment(text)).toBe(text);
  });

  test("a combining sequence counts each code point, as Postgres does", () => {
    // e + U+0301 is one glyph but two code points
    const accented = "é";
    expect(comment(accented.repeat(140))).toBe(accented.repeat(140));
    expect(comment(`${accented.repeat(140)}a`)).toBeUndefined();
  });
});

describe("PARSE-10: control characters and invalid UTF-16", () => {
  test("a NUL never reaches Postgres", () => {
    expect(comment("ok\u0000")).toBe("ok");
    expect(comment("\u0000")).toBeNull();
    expect(comment("\u0000\u0000 \u0000")).toBeNull();
  });

  test("a lone surrogate fails", () => {
    expect(comment("\uD800")).toBeUndefined();
    expect(comment("ok\uDC00")).toBeUndefined();
    expect(comment("😀\uD83D")).toBeUndefined();
  });
});
