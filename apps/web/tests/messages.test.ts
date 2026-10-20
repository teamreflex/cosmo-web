import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as z from "zod";

const appDir = join(import.meta.dir, "..");

const { baseLocale, locales } = z
  .object({ baseLocale: z.string(), locales: z.array(z.string()) })
  .parse(
    JSON.parse(
      readFileSync(join(appDir, "project.inlang/settings.json"), "utf8"),
    ),
  );

const pluralSchema = z.tuple([
  z.object({
    declarations: z.array(z.string()),
    selectors: z.array(z.string()),
    match: z.record(z.string(), z.string()),
  }),
]);
const catalogSchema = z.record(z.string(), z.union([z.string(), pluralSchema]));

const catalogs = new Map(
  locales.map((locale) => [
    locale,
    catalogSchema.parse(
      JSON.parse(readFileSync(join(appDir, `messages/${locale}.json`), "utf8")),
    ),
  ]),
);
const english = catalogs.get(baseLocale) ?? {};
const byKey = (a: string, b: string) => a.localeCompare(b);

/**
 * Paraglide falls back to English for a key a locale lacks, so a missing
 * translation only shows up here.
 */
describe("message catalogs", () => {
  test("cover the six locales", () => {
    expect(locales.toSorted(byKey)).toEqual(
      ["en", "fr", "ja", "ko", "zh-CN", "zh-TW"].toSorted(byKey),
    );
  });

  test.each(locales.filter((locale) => locale !== baseLocale))(
    "%s has exactly the English key set",
    (locale) => {
      const catalog = catalogs.get(locale) ?? {};
      expect(Object.keys(catalog).filter((key) => !(key in english))).toEqual(
        [],
      );
      expect(Object.keys(english).filter((key) => !(key in catalog))).toEqual(
        [],
      );
    },
  );

  /**
   * A plural branch the locale's rules never select is dead copy, so zh, ja
   * and ko, whose only category is `other`, carry no `countPlural=one`.
   */
  test.each(locales)(
    "%s plurals branch only on its own plural categories",
    (locale) => {
      const categories: readonly string[] = new Intl.PluralRules(
        locale,
      ).resolvedOptions().pluralCategories;
      const catalog = catalogs.get(locale) ?? {};

      for (const [key, message] of Object.entries(english)) {
        if (!Array.isArray(message)) continue;
        expect(Array.isArray(catalog[key]), [locale, key].join(" ")).toBeTrue();
      }

      for (const [key, message] of Object.entries(catalog)) {
        if (!Array.isArray(message)) continue;
        const branches = Object.keys(message[0].match).flatMap((branch) =>
          branch
            .split(", ")
            .flatMap((selector) =>
              selector.startsWith("countPlural=")
                ? [selector.slice("countPlural=".length)]
                : [],
            ),
        );
        expect(branches, [locale, key].join(" ")).toContain("other");
        for (const branch of branches) {
          if (branch === "*") continue;
          expect(categories, [locale, key].join(" ")).toContain(branch);
        }
      }
    },
  );

  test("compile without warnings", () => {
    const outdir = mkdtempSync(join(tmpdir(), "paraglide-"));
    try {
      const result = Bun.spawnSync(
        [
          "bunx",
          "@inlang/paraglide-js",
          "compile",
          "--project",
          "./project.inlang",
          "--outdir",
          outdir,
        ],
        { cwd: appDir, stderr: "pipe", stdout: "pipe" },
      );
      const output = `${result.stdout.toString()}${result.stderr.toString()}`;
      expect(result.exitCode, output).toBe(0);
      expect(output).not.toMatch(/warn|error|⚠/i);
    } finally {
      rmSync(outdir, { recursive: true, force: true });
    }
  }, 60_000);
});
