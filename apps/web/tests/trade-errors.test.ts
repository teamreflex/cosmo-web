import { tokenRefusalReasons } from "@apollo/trades/holdings";
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as z from "zod";
import { m } from "../src/i18n/messages";
import {
  claimFailure,
  formatTokenRefusal,
  formatTradeError,
} from "../src/lib/client/errors/trades";
import { ExpectedError } from "../src/lib/universal/errors/expected";
import { expectedErrorSerializationAdapter } from "../src/lib/universal/errors/serialization";
import {
  isTradeErrorCode,
  tradeErrorCodes,
} from "../src/lib/universal/errors/trades";

const locales = ["en", "fr", "ja", "ko"] as const;

/**
 * formatError's chain includes the accounts formatter, which reads the
 * validated client env, so the test supplies placeholders before loading it.
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
const { formatError } = await import("../src/lib/client/errors");

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

const tokenRefusalMessages = {
  not_owned: m.trade_token_refusal_not_owned,
  untransferable: m.trade_token_refusal_untransferable,
  locked: m.trade_token_refusal_locked,
  live: m.trade_token_refusal_live,
};

describe("trade error strings", () => {
  test.each(
    tradeErrorCodes.flatMap((code) =>
      locales.map((locale) => [code, locale] as const),
    ),
  )("trade_error_%s exists in %s", (code, locale) => {
    expect(catalogs[locale]?.[`trade_error_${code}`]).toBeString();
    expect(catalogs[locale]?.[`trade_error_${code}`]).not.toBe("");
  });

  test.each(
    tokenRefusalReasons.flatMap((reason) =>
      locales.map((locale) => [reason, locale] as const),
    ),
  )(
    "trade_token_refusal_%s exists in %s and names the objekt and serial",
    (reason, locale) => {
      const message = catalogs[locale]?.[`trade_token_refusal_${reason}`];
      expect(message).toBeString();
      expect(message).toContain("{objekt}");
      expect(message).toContain("#{serial}");
    },
  );

  test("listing_token_unavailable is per-reason copy, not an error code", () => {
    expect(isTradeErrorCode("listing_token_unavailable")).toBe(false);
  });
});

describe("formatTradeError", () => {
  test.each(tradeErrorCodes.map((code) => [code] as const))(
    "formats %s with its own string",
    (code) => {
      expect(formatTradeError(new ExpectedError(code))).toBe(
        z.string().parse(catalogs.en?.[`trade_error_${code}`]),
      );
    },
  );

  test("gives every code a distinct message", () => {
    const messages = tradeErrorCodes.map((code) =>
      formatTradeError(new Error(code)),
    );
    expect(new Set(messages).size).toBe(tradeErrorCodes.length);
  });

  test("ignores other domains' codes and non-errors", () => {
    expect(formatTradeError(new ExpectedError("not_signed_in"))).toBeNull();
    expect(formatTradeError("listing_closed")).toBeNull();
  });
});

describe("isTradeErrorCode", () => {
  test.each([
    ["already_claimed", true],
    ["claim_cap_reached", true],
    ["not_signed_in", false],
    ["cosmo_not_linked", false],
    ["listing_close", false],
    ["", false],
  ])("%s -> %p", (value, expected) => {
    expect(isTradeErrorCode(value)).toBe(expected);
  });
});

describe("formatError", () => {
  test("returns the trade message for trade codes", () => {
    expect(formatError(new ExpectedError("already_claimed"))).toBe(
      "Someone else accepted this listing first.",
    );
    expect(formatError(new ExpectedError("listing_updated"))).toBe(
      m.trade_error_listing_updated(),
    );
  });

  test("leaves other domains to their own formatters", () => {
    expect(formatError(new ExpectedError("not_signed_in"))).toBe(
      m.auth_error_not_signed_in(),
    );
    expect(formatError(new ExpectedError("rate_limited"))).toBe(
      m.error_rate_limited(),
    );
  });
});

describe("formatTokenRefusal", () => {
  test.each([
    ["not_owned", "HaSeul 310Z #00131 isn't in your COSMO account."],
    ["untransferable", "HaSeul 310Z #00131 can't be transferred."],
    ["locked", "HaSeul 310Z #00131 is locked in COSMO."],
    ["live", "HaSeul 310Z #00131 is already in a trade."],
  ] as const)("%s names the objekt and padded serial", (reason, expected) => {
    expect<string>(
      formatTokenRefusal(reason, { objekt: "HaSeul 310Z", serial: 131 }),
    ).toBe(expected);
  });

  test("keeps five-digit and longer serials whole", () => {
    expect<string>(
      formatTokenRefusal("locked", { objekt: "JinSoul 101Z", serial: 123456 }),
    ).toBe("JinSoul 101Z #123456 is locked in COSMO.");
  });

  test.each(
    tokenRefusalReasons.flatMap((reason) =>
      locales.map((locale) => [reason, locale] as const),
    ),
  )("%s interpolates fully in %s", (reason, locale) => {
    const message = tokenRefusalMessages[reason](
      { objekt: "HaSeul 310Z", serial: "00131" },
      { locale },
    );
    expect(message).toContain("HaSeul 310Z #00131");
    expect(message).not.toMatch(/[{}]|undefined|trade_token_refusal/);
  });

  test("each reason has its own message in every locale", () => {
    for (const locale of locales) {
      const messages = tokenRefusalReasons.map((reason) =>
        tokenRefusalMessages[reason](
          { objekt: "HaSeul 310Z", serial: "00131" },
          { locale },
        ),
      );
      expect(new Set(messages).size).toBe(tokenRefusalReasons.length);
    }
  });
});

describe("claimFailure", () => {
  test("names the token a refusal carries", () => {
    expect(
      claimFailure(
        new ExpectedError("claim_token_unavailable", {
          tokenId: 4021,
          reason: "locked",
        }),
      ),
    ).toEqual({ kind: "token", refusal: { tokenId: 4021, reason: "locked" } });
  });

  test.each([
    ["no data", undefined],
    ["an unknown reason", { tokenId: 4021, reason: "melted" }],
    ["a token id that isn't a number", { tokenId: "4021", reason: "live" }],
  ])("leaves a refusal with %s unnamed", (_, data) => {
    expect(
      claimFailure(new ExpectedError("claim_token_unavailable", data)),
    ).toEqual({ kind: "token", refusal: null });
  });

  test("answers a changed listing and a lost race in place", () => {
    expect(claimFailure(new ExpectedError("listing_updated"))).toEqual({
      kind: "updated",
    });
    expect(claimFailure(new ExpectedError("already_claimed"))).toEqual({
      kind: "claimed",
    });
  });

  test("leaves every other error to a toast", () => {
    for (const code of [
      "listing_closed",
      "listing_unavailable",
      "claim_cap_reached",
      "claim_assignment_invalid",
      "rate_limited",
    ]) {
      expect(claimFailure(new ExpectedError(code))).toBeNull();
    }
    expect(claimFailure("listing_updated")).toBeNull();
  });
});

describe("ExpectedError serialization", () => {
  test("keeps the code and data across the server boundary", () => {
    const { toSerializable, fromSerializable } =
      expectedErrorSerializationAdapter;
    const error = fromSerializable(
      toSerializable(
        new ExpectedError("claim_token_unavailable", {
          tokenId: 4021,
          reason: "live",
        }),
      ),
    );
    expect(error).toBeInstanceOf(ExpectedError);
    expect(error.message).toBe("claim_token_unavailable");
    expect(error.data).toEqual({ tokenId: 4021, reason: "live" });
    expect(claimFailure(error)).toEqual({
      kind: "token",
      refusal: { tokenId: 4021, reason: "live" },
    });
  });

  test("leaves an error without data without it", () => {
    const { toSerializable, fromSerializable } =
      expectedErrorSerializationAdapter;
    const error = fromSerializable(
      toSerializable(new ExpectedError("already_claimed")),
    );
    expect(error.data).toBeUndefined();
  });
});
