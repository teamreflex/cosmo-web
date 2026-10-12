import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

/**
 * The shadcn files phase 8 installs (item, spinner, toggle-group) are
 * retuned to the app's conventions, and the existing toggle and separator
 * keep their customisations.
 */

const ui = (file: string) =>
  readFileSync(join(import.meta.dir, "../src/components/ui", file), "utf8");
const component = (path: string) =>
  readFileSync(join(import.meta.dir, "../src/components", path), "utf8");

const installed = ["item.tsx", "spinner.tsx", "toggle-group.tsx"] as const;

/**
 * utils.ts reads the validated client env, so the render test supplies
 * placeholders before loading the spinner.
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
const { Spinner } = await import("../src/components/ui/spinner");
const { default: ListingTypePicker } =
  await import("../src/components/trade-listings/listing-type-picker");

describe("UI-01: phase 8 shadcn installs", () => {
  for (const file of installed) {
    test(`${file} follows the components/ui conventions`, () => {
      const source = ui(file);
      expect(source).toContain('import { cn } from "@/lib/utils";');
      expect(source).not.toContain('from "cn"');
      expect(source).not.toContain("use client");
      expect(source).not.toContain("lucide");
      expect(source).not.toContain("IconPlaceholder");
      expect(source).not.toContain("data-[state=on]");
      expect(source).not.toContain("CSSProperties");
      expect(source).not.toMatch(/\brounded-md\b/);
      expect(source).not.toContain("ring-ring");
    });
  }

  test("the spinner is the app's IconLoader2 with a localized label", () => {
    const source = ui("spinner.tsx");
    expect(source).toContain(
      'import { IconLoader2 } from "@tabler/icons-react";',
    );
    expect(source).not.toMatch(/\bIconLoader\b(?!2)/);
    expect(source).toContain("m.common_loading()");

    const markup = renderToStaticMarkup(createElement(Spinner));
    expect(markup).toContain("tabler-icon-loader-2");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-label="Loading"');
    expect(markup).toContain("animate-spin");
  });

  test("toggle-group styles Base UI's pressed state and reuses toggleVariants", () => {
    const source = ui("toggle-group.tsx");
    expect(source).toContain(
      'import { toggleVariants } from "@/components/ui/toggle";',
    );
    expect(source).toContain("aria-pressed:bg-muted");
    expect(source).toContain("data-pressed:bg-muted");
    expect(source).toContain("rounded-sm");
  });

  test("item rows use the app's radius and cosmo focus", () => {
    const source = ui("item.tsx");
    expect(source).toContain("rounded-sm border");
    expect(source).toContain("focus-visible:border-cosmo/60");
  });

  test("the declined overwrites kept the customised toggle and separator", () => {
    const toggle = ui("toggle.tsx");
    expect(toggle).toContain('import { cn } from "@/lib/utils";');
    expect(toggle).toContain("focus-visible:border-cosmo/60");
    expect(toggle).toContain("rounded-sm");
    expect(toggle).toContain("export { Toggle, toggleVariants };");

    const separator = ui("separator.tsx");
    expect(separator).toContain('import { cn } from "@/lib/utils";');
    expect(separator).not.toContain('from "cn"');
  });

  test("the listing type picker is a toggle-group with the current type pressed", () => {
    expect(component("trade-listings/listing-type-picker.tsx")).toContain(
      'import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";',
    );

    const render = (value: "trade" | null) => {
      const markup = renderToStaticMarkup(
        createElement(ListingTypePicker, { value, onChange: () => {} }),
      );
      expect(markup).toStartWith(
        '<div data-orientation="horizontal" role="group" data-slot="toggle-group"',
      );
      expect(markup).toContain('aria-label="Listing type"');
      return [...markup.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)].map(
        ([, attributes = "", label]) => ({
          label,
          slot: /data-slot="([^"]*)"/.exec(attributes)?.[1],
          pressed: /aria-pressed="([^"]*)"/.exec(attributes)?.[1],
        }),
      );
    };

    expect(render(null)).toEqual([
      { label: "All", slot: "toggle-group-item", pressed: "true" },
      { label: "Trades", slot: "toggle-group-item", pressed: "false" },
    ]);
    expect(render("trade")).toEqual([
      { label: "All", slot: "toggle-group-item", pressed: "false" },
      { label: "Trades", slot: "toggle-group-item", pressed: "true" },
    ]);
  });

  test("the listing page's pending buttons use Spinner", () => {
    for (const file of [
      "trade-listings/confirm-trade-dialog.tsx",
      "trade-listings/withdraw-listing-dialog.tsx",
    ]) {
      const source = component(file);
      expect(source).toContain('import { Spinner } from "../ui/spinner";');
      expect(source).not.toContain("IconLoader2");
    }
  });

  /**
   * design/SHADCN.md adopts Item for simple list rows but keeps the /market
   * grid rows hand-rolled, because they are column grids.
   */
  test("the Listings feed rows stay a hand-rolled column grid", () => {
    const source = component("trade-listings/listing-feed-row.tsx");
    expect(source).not.toContain("ui/item");
    expect(source).toContain("lg:grid-cols-[96px_minmax(0,1.25fr)");
  });
});
