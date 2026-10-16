import { textLength } from "@apollo/util";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as z from "zod";
import { formatFeedbackError } from "../src/lib/client/errors/feedback";
import { ExpectedError } from "../src/lib/universal/errors/expected";
import {
  feedbackErrorCodes,
  isFeedbackErrorCode,
} from "../src/lib/universal/errors/feedback";
import {
  FEEDBACK_TEXT_MAX,
  normalizeFeedbackText,
} from "../src/lib/universal/feedback";
import { leaveFeedbackSchema } from "../src/lib/universal/schema/feedback";

const tradeId = "7d0b4f7e-3c1a-4b8e-9f2d-6a5c4b3a2f10";
const valid = { tradeId, rating: "positive", comment: "Fast and friendly" };

type LeaveInput = Record<string, string | number | boolean | Date | null>;

const leave = (input: LeaveInput) =>
  leaveFeedbackSchema.safeParse({ ...valid, ...input });

// the comment a leave parses to, null for none, or undefined when it's refused
const comment = (text: string) => {
  const parsed = leave({ comment: text });
  return parsed.success ? parsed.data.comment : undefined;
};

// invisible characters, spelled out so the source shows none of them
const RLO = String.fromCodePoint(0x20_2e);
const LRM = String.fromCodePoint(0x20_0e);
const ZWSP = String.fromCodePoint(0x20_0b);
const WJ = String.fromCodePoint(0x20_60);
const BOM = String.fromCodePoint(0xfe_ff);

describe("PARSE-02: comment length and whitespace", () => {
  test("empty and whitespace-only comments parse as none", () => {
    expect(comment("")).toBeNull();
    expect(comment(" ")).toBeNull();
    expect(comment("\n\t  \n")).toBeNull();
  });

  test("one character passes", () => {
    expect(comment("a")).toBe("a");
  });

  test("280 characters pass and 281 fail", () => {
    expect(comment("a".repeat(280))).toBe("a".repeat(280));
    expect(comment("a".repeat(281))).toBeUndefined();
  });

  test("an omitted or null comment parses as none", () => {
    const omitted = leaveFeedbackSchema.safeParse({
      tradeId,
      rating: "positive",
    });
    expect(omitted.success).toBe(true);
    expect(omitted.data?.comment).toBeNull();
    expect(leave({ comment: null }).data?.comment).toBeNull();
  });

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

  test("281 astral emoji fail", () => {
    expect(comment(emoji.repeat(281))).toBeUndefined();
  });

  test("a combining sequence counts each code point, as Postgres does", () => {
    // e + U+0301 is one glyph but two code points
    const accented = "é";
    expect(comment(accented.repeat(140))).toBe(accented.repeat(140));
    expect(comment(`${accented.repeat(140)}a`)).toBeUndefined();
  });

  test("the counter the form shows uses the schema's count", () => {
    expect(textLength(emoji.repeat(280))).toBe(FEEDBACK_TEXT_MAX);
    expect(textLength("é")).toBe(2);
  });
});

describe("PARSE-06: server-owned fields are stripped", () => {
  test("a leave keeps only its own keys", () => {
    const parsed = leave({
      toUserId: "victim",
      fromUserId: "someone",
      role: "seller",
      raterSide: "to",
      scored: false,
      createdAt: new Date(),
      removedAt: null,
    });
    expect(parsed.success).toBe(true);
    expect(Object.keys(parsed.data ?? {}).toSorted()).toEqual([
      "comment",
      "rating",
      "tradeId",
    ]);
  });
});

describe("PARSE-10: control characters, invalid UTF-16 and invisible text", () => {
  test("a NUL never reaches Postgres", () => {
    expect(comment("ok\u0000")).toBe("ok");
    expect(comment("\u0000")).toBeNull();
    expect(comment("\u0000\u0000 \u0000")).toBeNull();
  });

  test("other control and bidi characters are removed", () => {
    expect(comment(`o\u0007k${RLO}`)).toBe("ok");
  });

  test("a lone surrogate fails", () => {
    expect(comment("\uD800")).toBeUndefined();
    expect(comment("ok\uDC00")).toBeUndefined();
    expect(comment("😀\uD83D")).toBeUndefined();
  });

  test("zero-width and bidi characters alone show nothing", () => {
    expect(comment(`${ZWSP}${LRM}${RLO}`)).toBeNull();
    expect(comment(`${ZWSP} ${WJ} ${BOM}`)).toBeNull();
  });

  test.each([[123], [[]], [{}]])("a comment of %p fails", (value) => {
    expect(
      leaveFeedbackSchema.safeParse({ ...valid, comment: value }).success,
    ).toBe(false);
  });

  test("normalizing drops what the schema would", () => {
    expect(normalizeFeedbackText(`${RLO}a\u0000\n\nb `)).toBe("a b");
  });
});

const locales = ["en", "fr", "ja", "ko"] as const;
const catalogs = Object.fromEntries(
  locales.map((locale) => [
    locale,
    z
      .record(z.string(), z.unknown())
      .parse(
        JSON.parse(
          readFileSync(
            join(import.meta.dir, `../messages/${locale}.json`),
            "utf8",
          ),
        ),
      ),
  ]),
);

describe("feedback error codes", () => {
  test.each(
    feedbackErrorCodes.flatMap((code) =>
      locales.map((locale) => [code, locale] as const),
    ),
  )("feedback_error_%s exists in %s", (code, locale) => {
    expect(catalogs[locale]?.[`feedback_error_${code}`]).toBeString();
    expect(catalogs[locale]?.[`feedback_error_${code}`]).not.toBe("");
  });

  test.each(feedbackErrorCodes.map((code) => [code] as const))(
    "formats %s with its own string",
    (code) => {
      expect(formatFeedbackError(new ExpectedError(code))).toBe(
        z.string().parse(catalogs.en?.[`feedback_error_${code}`]),
      );
    },
  );

  test("ignores other domains' codes and non-errors", () => {
    expect(
      formatFeedbackError(new ExpectedError("trade_not_found")),
    ).toBeNull();
    expect(formatFeedbackError("feedback_not_found")).toBeNull();
    expect(isFeedbackErrorCode("feedback_not_found")).toBe(true);
    expect(isFeedbackErrorCode("trade_own")).toBe(false);
  });
});
