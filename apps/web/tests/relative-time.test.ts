import { describe, expect, test } from "bun:test";
import { locales } from "../src/i18n/runtime";
import { formatRelative } from "../src/lib/client/time";

const ago = (seconds: number) => new Date(Date.now() - seconds * 1000);

describe("relative timestamps", () => {
  test("narrow ages read as a distance in every locale, never a bare sign", () => {
    for (const locale of locales) {
      for (const seconds of [30, 18 * 60, 3 * 3600, 5 * 86400]) {
        const text = formatRelative(ago(seconds), "narrow", locale);
        expect(text).not.toMatch(/^[+\-−]/);
      }
    }
    expect(formatRelative(ago(18 * 60), "narrow", "fr")).toMatch(
      /^il y a 18\smin$/,
    );
    expect(formatRelative(ago(18 * 60), "narrow", "en")).toBe("18m ago");
    expect(formatRelative(ago(3 * 3600), "narrow", "ja")).toBe("3時間前");
  });

  test("Japanese ages read without a space in either style", () => {
    for (const style of ["long", "narrow"] as const) {
      expect(formatRelative(ago(4 * 3600), style, "ja")).toBe("4時間前");
      expect(formatRelative(ago(18 * 60), style, "ja")).toBe("18分前");
    }
    expect(formatRelative(ago(4 * 3600), "long", "en")).toBe("4 hours ago");
  });
});
