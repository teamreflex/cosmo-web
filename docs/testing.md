# Testing

Tests are `bun test` suites in each workspace's `tests/` directory.

## Running tests

- Everything: `turbo test`. One workspace: `turbo test --filter web` (or `--filter @apollo/trades`).
- One file: `bun test tests/grid.test.ts` from the workspace directory. `bun test <substring>` runs every file whose path contains it.
- `turbo test` depends on `^typecheck`, not on `i18n`. The web tests import no compiled messages, so they run without `turbo i18n`. Typecheck does need it ([frontend.md](frontend.md#i18n)).

## What earns a test

A test guards pure logic that is easy to break and hard to notice in the browser.

- Examples: the trade lifecycle and holdings allocator in `packages/trades`, the drain's transfer decisions, serial arithmetic, account guards and role matrices, grid and COMO calendar maths, input parsing that refuses hostile values.
- Tests import pure modules by relative path (`../src/lib/universal/...`) and need no database, server or network.
- There are no database or server-function integration tests, and no mocked COSMO or HTTP responses.
- `apps/chat` is the exception: it is pure Effect, so its suite drives the real handlers over an in-memory store ([apps/chat/CLAUDE.md](../apps/chat/CLAUDE.md)).
- `apps/web/tests/messages.test.ts` is a catalog test: it fails when a locale's keys differ from English or a plural uses categories the locale lacks.
- Anything a person sees on the page (copy, layout, which panel renders, formatting) is checked by running the app ([tooling.md](tooling.md)), not by a test.

## Rules

- Never mock modules. `anti-slop/no-module-mocking` is a lint error, so drive pure modules and real interfaces instead.
- Never `await expect(promise).rejects...`. In bun:test the matcher returns `void` and blocks until the promise settles, so a failing matcher fails the test without `await`. The `await` trips the type-aware `await-thenable` lint error.
