import { afterAll, describe, expect, test } from "bun:test";
import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { baseLocale, overwriteGetLocale } from "../src/i18n/runtime";
import {
  type FeedbackRep,
  formatPercentPositive,
  toFeedbackRep,
} from "../src/lib/universal/feedback";

/**
 * utils.ts reads the validated client env, so the badge render supplies
 * placeholders before loading it.
 */
const clientEnv = {
  VITE_APP_NAME: "Apollo",
  VITE_BASE_URL: "localhost",
  VITE_APP_ENV: "development",
  VITE_COMMIT_SHA: "test",
  VITE_TYPESENSE_URL: "localhost",
  VITE_TYPESENSE_KEY: "test",
  VITE_CDN_URL: "https://cdn.test.invalid",
};
for (const [key, value] of Object.entries(clientEnv)) {
  process.env[key] ??= value;
}
const { default: FeedbackBadge } =
  await import("../src/components/feedback/feedback-badge");

const locales = ["en", "fr", "ja", "ko"] as const;
type Locale = (typeof locales)[number];

afterAll(() => overwriteGetLocale(() => baseLocale));

// the share positive as the stats row's generated column computes it
const share = (positive: number, rated: number) => positive / rated;

const stats = (ratings: number, positive: number, negative: number) => ({
  positive,
  neutral: ratings - positive - negative,
  negative,
  percentPositive:
    positive + negative === 0 ? null : share(positive, positive + negative),
});

const render = (
  locale: Locale,
  props: ComponentProps<typeof FeedbackBadge>,
) => {
  overwriteGetLocale(() => locale);
  // the badge's markup read as text
  return renderToStaticMarkup(createElement(FeedbackBadge, props))
    .replaceAll(/<[^>]+>/g, "")
    .replaceAll("&#x27;", "'");
};

describe("SCORE-17: percent formatting", () => {
  test.each([
    [1, 1, "100%"],
    [999, 1000, "99.9%"],
    [9999, 10000, "99.9%"],
    [49, 50, "98.0%"],
    [24, 25, "96.0%"],
    [1, 3, "33.3%"],
    [0, 2, "0.0%"],
    [228, 230, "99.1%"],
    [29, 100, "29.0%"],
  ])("%i of %i positive reads %s", (positive, rated, expected) => {
    expect(formatPercentPositive(share(positive, rated), "en")).toBe(expected);
  });

  test("only exactly all positive reads a bare 100, never 100.0%", () => {
    for (let rated = 1; rated <= 2000; rated++) {
      const text = formatPercentPositive(share(rated - 1, rated), "en");
      expect(text).not.toBe("100%");
      expect(text).not.toBe("100.0%");
      expect(formatPercentPositive(share(rated, rated), "en")).toBe("100%");
    }
  });

  test.each([
    [1, 1, "100%"],
    [999, 1000, "99%"],
    [87, 89, "97%"],
    [0, 2, "0%"],
  ])("%i of %i positive reads %s whole", (positive, rated, expected) => {
    expect(formatPercentPositive(share(positive, rated), "en", 0)).toBe(
      expected,
    );
  });

  test("the cut never rounds up across every share up to 400 ratings", () => {
    for (let rated = 1; rated <= 400; rated++) {
      for (let positive = 0; positive <= rated; positive++) {
        const permille = Math.floor((positive * 1000) / rated);
        expect(formatPercentPositive(share(positive, rated), "en")).toBe(
          permille === 1000
            ? "100%"
            : `${Math.floor(permille / 10)}.${permille % 10}%`,
        );
      }
    }
  });

  test("no rating renders nothing compact", () => {
    expect(toFeedbackRep(null)).toBeNull();
    expect(toFeedbackRep(stats(0, 0, 0))).toBeNull();
    expect(render("en", { variant: "compact", rep: null })).toBe("");
  });

  test("ratings with no positive or negative read as a count on every badge", () => {
    const rep = toFeedbackRep(stats(3, 0, 0));
    expect(rep).toEqual({ count: 3, percent: null });
    expect(render("en", { variant: "compact", rep })).toBe("3 ratings");
    expect(render("en", { variant: "compact", rep, narrow: true })).toBe(
      "3 ratings",
    );
    expect(render("en", { variant: "full", rep })).toBe("3 ratings");
  });

  test("below md the compact badge narrows to the whole percent, cut", () => {
    const narrow = (positive: number, negative: number, ratings: number) =>
      render("en", {
        variant: "compact",
        rep: toFeedbackRep(stats(ratings, positive, negative)),
        narrow: true,
      });
    // both forms render, each hidden at the other's widths
    expect(narrow(228, 2, 231)).toBe("99%99.1% · 231");
    expect(narrow(86, 2, 88)).toBe("97%97.7% · 88");
    expect(narrow(999, 1, 1000)).toBe("99%99.9% · 1,000");
    expect(narrow(31, 0, 31)).toBe("100%100% · 31");
  });

  test("only a share from 90% draws in the positive colour", () => {
    const markup = (positive: number, negative: number) =>
      renderToStaticMarkup(
        createElement(FeedbackBadge, {
          variant: "full",
          rep: toFeedbackRep(stats(positive + negative, positive, negative)),
        }),
      );
    expect(markup(228, 2)).toContain("text-teal-700");
    expect(markup(9, 1)).toContain("text-teal-700");
    expect(markup(8, 2)).not.toContain("text-teal-700");
    expect(markup(0, 2)).not.toContain("text-teal-700");
  });

  test("the compact badge reads percent · count, the MarketA rows' form", () => {
    const rep = (positive: number, negative: number, ratings: number) =>
      toFeedbackRep(stats(ratings, positive, negative));
    expect(
      render("en", {
        variant: "compact",
        rep: rep(228, 2, 231),
      }),
    ).toBe("99.1% · 231");
    expect(render("en", { variant: "compact", rep: rep(49, 1, 54) })).toBe(
      "98.0% · 54",
    );
    expect(render("en", { variant: "compact", rep: rep(31, 0, 31) })).toBe(
      "100% · 31",
    );
    expect(render("en", { variant: "compact", rep: rep(0, 2, 2) })).toBe(
      "0.0% · 2",
    );
    expect(
      render("en", {
        variant: "compact",
        rep: rep(1500, 0, 1500),
      }),
    ).toBe("100% · 1,500");
  });

  test("the full badge says positive and the count", () => {
    const full = (rep: FeedbackRep | null) =>
      render("en", { variant: "full", rep });
    expect(full(toFeedbackRep(stats(231, 228, 2)))).toBe(
      "99.1% positive\u00a0· 231 ratings",
    );
    expect(full(null)).toBe("No feedback yet");
    expect(full(toFeedbackRep(stats(1, 0, 0)))).toBe("1 rating");
    expect(full(toFeedbackRep(stats(5, 0, 0)))).toBe("5 ratings");
    expect(full(toFeedbackRep(stats(1500, 1500, 0)))).toBe(
      "100% positive\u00a0· 1,500 ratings",
    );
  });
});

describe("I18N-02: percent formatting per locale", () => {
  const expected = {
    en: { percents: ["99.9%", "98.0%", "100%"] },
    fr: { percents: ["99,9\u00a0%", "98,0\u00a0%", "100\u00a0%"] },
    ja: { percents: ["99.9%", "98.0%", "100%"] },
    ko: { percents: ["99.9%", "98.0%", "100%"] },
  } satisfies Record<Locale, { percents: [string, string, string] }>;

  test.each([...locales])("%s uses its own number format", (locale) => {
    expect(
      [share(999, 1000), share(49, 50), share(1, 1)].map((percent) =>
        formatPercentPositive(percent, locale),
      ),
    ).toEqual(expected[locale].percents);
  });

  test.each([...locales])(
    "%s badges show the percent in its own format, cut rather than rounded",
    (locale) => {
      const badge = render(locale, {
        variant: "full",
        rep: toFeedbackRep(stats(1000, 999, 1)),
      });
      expect(badge).toContain(expected[locale].percents[0]);
      expect(badge).not.toContain("100");
    },
  );

  test("full badges read naturally in each locale", () => {
    const props = {
      variant: "full",
      rep: toFeedbackRep(stats(231, 228, 2)),
    } satisfies ComponentProps<typeof FeedbackBadge>;
    expect(render("fr", props)).toBe(
      "99,1\u00a0% positives\u00a0· 231 évaluations",
    );
    expect(render("ja", props)).toBe("好評価99.1%\u00a0· 評価231件");
    expect(render("ko", props)).toBe("긍정 99.1%\u00a0· 평가 231건");
    expect(render("ko", { variant: "full", rep: null })).toBe(
      "아직 평가가 없습니다",
    );
  });
});
