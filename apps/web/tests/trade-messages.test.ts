import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as z from "zod";
import { m } from "../src/i18n/messages";

const locales = ["en", "fr", "ja", "ko"] as const;

/**
 * The message keys phase 8 adds: the Listings feed, the listing page, the
 * composer and the trade errors.
 */
const prefixes = [
  "market_listings_",
  "listing_detail_",
  "listing_composer_",
  "trade_error_",
  "trade_token_refusal_",
];
const extraKeys = ["common_hours_minutes"];

const pluralSchema = z.tuple([
  z.object({
    declarations: z.array(z.string()),
    selectors: z.array(z.string()),
    match: z.record(z.string(), z.string()),
  }),
]);
const messageSchema = z.union([z.string(), pluralSchema]);

type Message = z.infer<typeof messageSchema>;

/**
 * A locale's phase 8 messages, by key.
 */
function readCatalog(locale: string): ReadonlyMap<string, Message> {
  const all = z
    .record(z.string(), z.unknown())
    .parse(
      JSON.parse(
        readFileSync(
          join(import.meta.dir, `../messages/${locale}.json`),
          "utf8",
        ),
      ),
    );

  return new Map(
    Object.entries(all)
      .filter(
        ([key]) =>
          prefixes.some((prefix) => key.startsWith(prefix)) ||
          extraKeys.includes(key),
      )
      .map(([key, value]): [string, Message] => [
        key,
        messageSchema.parse(value),
      ]),
  );
}

const catalogs = {
  en: readCatalog("en"),
  fr: readCatalog("fr"),
  ja: readCatalog("ja"),
  ko: readCatalog("ko"),
} satisfies Record<(typeof locales)[number], ReadonlyMap<string, Message>>;
const english = catalogs.en;

/**
 * Every string a message can render, its plural branches included.
 */
function texts(message: Message) {
  return Array.isArray(message)
    ? message.flatMap((variant) => Object.values(variant.match))
    : [message];
}

describe("phase 8 strings in every locale (ERR-02)", () => {
  test("every prefix has keys", () => {
    for (const prefix of prefixes) {
      expect(
        [...english.keys()].some((key) => key.startsWith(prefix)),
      ).toBeTrue();
    }
  });

  test.each(locales.map((locale) => [locale]))(
    "%s declares every plural message",
    (locale) => {
      const catalog = catalogs[locale];
      const plurals = [...english].filter(([, value]) => Array.isArray(value));
      expect(plurals.length).toBeGreaterThan(10);

      for (const [key] of plurals) {
        const message = catalog.get(key);
        expect(Array.isArray(message), [locale, key].join(" ")).toBeTrue();
        if (!Array.isArray(message)) continue;
        const [variant] = message;
        expect(variant?.declarations, [locale, key].join(" ")).toEqual([
          "input count",
          "local countPlural = count: plural",
        ]);
        expect(variant?.selectors).toEqual(["countPlural"]);
        expect(Object.keys(variant?.match ?? {})).toContain(
          "countPlural=other",
        );
      }
    },
  );

  test.each(locales.map((locale) => [locale]))(
    "%s has no empty strings",
    (locale) => {
      for (const [key, message] of catalogs[locale]) {
        for (const text of texts(message)) {
          expect(text.trim(), [locale, key].join(" ")).not.toBe("");
        }
      }
    },
  );

  test.each(locales.map((locale) => [locale]))(
    "%s keeps every placeholder English uses",
    (locale) => {
      const placeholders = (text: string) =>
        [...text.matchAll(/\{([a-z]\w*)\}/gi)].flatMap(([, name]) =>
          name === undefined ? [] : [name],
        );

      for (const [key, message] of english) {
        const translated = catalogs[locale].get(key);
        if (translated === undefined) continue;
        expect(
          new Set(texts(translated).flatMap(placeholders)),
          [locale, key].join(" "),
        ).toEqual(new Set(texts(message).flatMap(placeholders)));
      }
    },
  );
});

describe("composer footer counts (CMP-05)", () => {
  const footer = (offered: number, wanted: number, locale: "en" | "fr") =>
    m.listing_composer_footer(
      {
        offered: m.listing_composer_footer_offered(
          { count: offered },
          { locale },
        ),
        wanted: m.listing_composer_footer_wanted({ count: wanted }, { locale }),
      },
      { locale },
    );

  test("pluralises each side on its own", () => {
    expect<string>(footer(1, 6, "en")).toBe("1 objekt ⇄ 6 objekts");
    expect<string>(footer(2, 1, "en")).toBe("2 objekts ⇄ 1 objekt");
    expect<string>(footer(1, 6, "fr")).toBe("1 objekt ⇄ 6 objekts");
  });

  test("the trade total reads per count", () => {
    expect<string>(m.listing_composer_trade_total({ count: 1 })).toBe(
      "Trade · 1 objekt",
    );
    expect<string>(m.listing_composer_trade_total({ count: 6 })).toBe(
      "Trade · 6 objekts",
    );
  });
});

describe("decided terminology (ERR-05)", () => {
  /**
   * Everything is a listing, so no copy says bundle, and listings never
   * expire, so none mentions expiry, in any language. A direct offer's
   * errors aren't listing copy: pending offers expire after 72 hours.
   */
  const banned = {
    en: [/bundle/i, /expir/i],
    fr: [/\blots?\b/i, /expir/i],
    ja: [
      /バンドル/,
      /まとめ売り/,
      /(?<!リ)セット/,
      /期限切れ/,
      /有効期限/,
      /失効/,
    ],
    ko: [/묶음/, /만료/],
  } satisfies Record<(typeof locales)[number], RegExp[]>;

  test.each(locales.map((locale) => [locale]))("%s says neither", (locale) => {
    for (const [key, message] of catalogs[locale]) {
      if (key.startsWith("trade_error_offer_")) continue;
      for (const text of texts(message)) {
        for (const pattern of banned[locale]) {
          expect(text, [locale, key].join(" ")).not.toMatch(pattern);
        }
      }
    }
  });
});
