# Frontend: components, forms, styling and i18n

Conventions for the React side of `apps/web`.

## Components

- Files are `kebab-case.tsx`, grouped by domain under `components/<feature>/`.
- A feature component is `export default function Name(props: Props)` with hooks first and sub-components below it. `components/ui/` and hooks use named exports.
- `components/ui/` is vendored shadcn/ui and exempt from the anti-slop lint rules. Add a missing component with the shadcn CLI ([libraries.md](libraries.md)).

## UI stack and Base UI

The UI is shadcn/ui in the `base-vega` style on [Base UI](https://base-ui.com/), with Tabler icons.

- Compose a part with another element through its `render` prop (`<DialogTrigger render={<Button variant="outline" />}>`), never `asChild`.
- A part that renders a non-button element needs `nativeButton={false}`, which also adds `role="button"`. Links styled as buttons therefore apply `buttonVariants()` to the `<Link>` itself.
- Never add Radix primitives, because mixing them with Base UI overlays breaks Esc layering and focus traps.
- State attributes are Base UI's (`data-open`, `data-closed`, `data-checked`, `data-active`, `data-popup-open`), not Radix's `data-state`. Style with `data-open:` and friends.

Base UI behaviours that bite:

- Enter transitions run only when `open` changes after mount. Keep overlays mounted and drive `open`, rather than mounting them open.
- Select's `onValueChange` fires when the current value is re-picked, so guard side effects. The settings dialog's language Select skips the current locale, because `setLocale` reloads the page.
- `AlertDialogAction` is a Close part. Call `event.preventBaseUIHandler()` in `onClick` to keep the dialog open while a mutation runs.
- `Radio.Root` renders a `<span>` unless given `nativeButton` and `render={<button />}`.
- An open popover inserts hidden focus-guard spans (`data-base-ui-focus-guard`) and an `aria-owns` span beside its trigger. `:first-child`-style selectors on the trigger's parent must skip them (`components/ui/button-group.tsx`).
- Drawers dismiss on a fixed swipe rule (past half the height, or at least 0.5 px/ms). A swipe-dismissed drawer must close in the same `onOpenChange` call (reason `"swipe"`) or it springs back.
- `data-base-ui-swipe-ignore` stops a swipe starting on that element (the flippable objekt card).
- With classic scrollbars, the scroll lock sets `scrollbar-gutter: stable`, which leaves an empty strip that fixed layers can't paint into. Right-side Sheets cover it with the `right-window-edge` utility. Headless Chrome has only overlay scrollbars, so check this in a desktop browser.
- iOS 26+ Safari shows a solid band under open drawers and sheets above its floating toolbar. It is a platform artefact that no CSS moves; don't spend time on it.

## Hydration

- `useHydrated()` (`hooks/use-hydrated.ts`) is false only during SSR and the hydration render, and true on the very first render after a client navigation. Use it to guard output that differs between server and client, such as timestamps and locale formatting.
- `<Hydrated fallback={...}>` (`components/hydrated.tsx`) is the component form.
- A component that reads a sibling DOM node on its first render (`components/portal.tsx`) keeps a `useEffect` + `setState` mount gate instead, because after a client navigation `useHydrated()` is already true before the target exists. Disable `react/set-state-in-effect` on that line.

## Client state

- Filters and other shareable view state live in URL search params ([tanstack.md](tanstack.md#routes)).
- Per-page context lives in `providers/` (profile, binder viewer, metadata dialog, user state, theme, media query).
- `src/store.ts` is the one zustand store, for recent user searches.

## Forms

- Forms use `react-hook-form` with `standardSchemaResolver(schema)`, a `Controller` per field, and `Field` / `FieldLabel` / `FieldError` from `components/ui/field`. `components/auth/account/update-username.tsx` is a small reference.
- Reuse the server function's own Zod schema as the resolver. Seed `defaultValues` with the full payload so identity fields such as `slug` and `tokenId` ride along, bind inputs to the real paths (`entries.${i}.price`) and submit `data` as it is.
- Use a separate client schema only when the form's shape differs from the request (a selection subset). Even then, share the per-field rule from one place (`salePriceSchema`).
- Keep server validators strict and block bad input on the client with the form, not by loosening the server.
- Prefer `useForm` over `useState`-driven dialogs.
- Submit with `mutation.mutate(data, { onSuccess, onError })`. Use `mutateAsync` only when the form needs `formState.isSubmitting` or the result, because a rejection then escapes `handleSubmit` as an unhandled rejection.
- A shared mutation hook that needs form values is generic over `TVariables` (default `void`) and is called as `form.handleSubmit((values) => mutation.mutate(values))` (`hooks/use-add-to-list.ts`). Don't read `form.getValues()` inside a no-argument thunk.

Validation messages:

- A message a user can reach is translated. In web app schemas, write it as `{ error: () => m.key() }`, which resolves in the viewer's locale when the schema runs (`banUserSchema` in `lib/universal/schema/reports.ts`).
- Package schemas can't import `m`, so their messages stay English. The form blocks what a user can reach before submitting, with translated reasons of its own (the listing composer's footer).
- A row-level `.refine` sets its path to `rows.${i}.field` so the error lands on the field.

## Tailwind

Tailwind v4, configured CSS-first in `styles/tailwind.css`, with shadcn tokens in `styles/shadcn.css` and custom utilities such as `container` and `right-window-edge` in `styles/layout.css`.

- Use v4 syntax: `bg-(--my-var)`, not `bg-[var(--my-var)]`, and `oklch` colours.
- `@theme inline` collapses `var()` chains at build time. A token that must be overridable at runtime goes in a non-inline `@theme` block; check the built CSS references your token.
- Merge classes with `cn()` from `lib/utils.ts`. Variants use `cva()` (see `components/ui/button.tsx`).
- `aspect-photocard` is the objekt card ratio.

Typography:

- Font size and tracking come from the theme scale, never arbitrary values like `text-[11px]` or `tracking-[0.14em]`. Round an in-between design value to the nearest step.
- Sizes are `text-xxs` (10px, defined in `styles/tailwind.css`), `text-xs`, `text-sm`, `text-base` and up. Tracking is `tracking-wide`, `tracking-wider` or `tracking-widest`.
- A new custom size needs a `--text-*` token and an entry in the `font-size` class group of `createCn` in `lib/utils.ts`. Without the entry, `cn()` reads the class as a text colour and drops it when a colour class follows.
- The only arbitrary sizes allowed are computed ones with no scale step: `text-[clamp(...)]`, `text-[length:...]` and `text-[0px]`.
- Small uppercase labels above a value: `text-xxs font-medium tracking-widest text-muted-foreground uppercase`.
- `font-mono` is for numbers and codes (prices, serials, counts, ranks like "#2 of 3"). Labels, headings, links and buttons stay sans, even when uppercase.

Prices:

- A seller's own price keeps its decimals through `formatPrice()`.
- A price converted into the viewer's currency (`useDisplayCurrency()`, `useSaleConversionRate()`) is approximate. It goes through `formatConvertedPrice()`, which drops minor units from 1,000, compacts from 1,000,000, and puts the full value in a `title`.

## i18n

Paraglide JS, with six locales (`en ko ja fr zh-CN zh-TW`) and `en` as the base.

- Every user-visible string is an `m.key()` from `@/i18n/messages`, with the key added to all six `apps/web/messages/*.json` files.
- Paraglide falls back to English at run time for a missing key, so only `tests/messages.test.ts` catches it. That test also fails a plural that uses categories the locale lacks.
- Plurals use a `countPlural` selector; copy the shape of an existing plural message.
- A link inside a sentence is markup in every locale (`"ask in the {#link}{appName} Discord{/link}"`), rendered with `<ParaglideMessage message={m.key} inputs={...} markup={{ link: ... }} />` from `@inlang/paraglide-js-react`. Don't split the sentence into several messages, because translators need to move the link.
- Markup names are type-checked, and calling `m.key()` directly returns the text with the markup stripped.
- `src/i18n/` is generated and gitignored. Run `turbo i18n` (or `bun run i18n` in `apps/web`) in a fresh checkout and after merging a branch that added keys, or typecheck fails with TS2339 on `m.*`.
