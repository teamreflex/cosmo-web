# Testing

Tests are `bun test` suites in each workspace's `tests/` directory.

## Running tests

- Everything: `turbo test`. One workspace: `turbo test --filter web` (or `--filter @apollo/trades`).
- One file: `bun test tests/grid.test.ts` from the workspace directory. `bun test <substring>` runs every file whose path contains it.
- The web tests import no compiled messages, so `turbo test` runs without `turbo i18n` ([tooling.md](tooling.md#monorepo)).

## What earns a test

A test guards pure logic that is easy to break and hard to notice in the browser.

- Examples: the trade lifecycle and holdings allocator in `packages/trades`, the drain's transfer decisions, serial arithmetic, account guards and role matrices, grid and COMO calendar maths, input parsing that refuses hostile values.
- Tests import pure modules by relative path (`../src/lib/universal/...`) and need no database, server or network.
- There are no database or server-function integration tests, and no mocked COSMO or HTTP responses.
- `apps/chat` is the exception: it is pure Effect, so its suite drives the real handlers over an in-memory store ([apps/chat/CLAUDE.md](../apps/chat/CLAUDE.md)).
- `apps/web/tests/messages.test.ts` is a catalog test: it fails when a locale's keys differ from English or a plural uses categories the locale lacks.
- Anything a person sees on the page (copy, layout, which panel renders, formatting) is checked by running the app ([browser-testing.md](browser-testing.md)), not by a test.

## One test per rule

A test stays only while some plausible wrong edit to the source fails it and no other test.

- Feed a function only what production can hand it: no input the types forbid, and no state a schema, a database constraint or the trade lifecycle rules out, because a test of an unreachable branch only keeps that branch alive.
- Hostile input at a real boundary (URL params, server-function schemas, tokens, sockets) is reachable. Test one value per refusal class, not one per field.
- Test a rule in the module that implements it. A caller's test covers what the caller adds, such as wiring the rule in, not the rule again.
- In a table keep the rows at, just under and just over a boundary, and drop rows in the same equivalence class.
- Prefer boundary rows to a sweep. A property test earns its place only for cases examples can't reach, with a run count sized to how often its generator hits them.
- Never assert a constant against its literal, a table against a copy of itself, or an expected value computed by the function under test.
- Never test zod, Effect, `Intl`, `node:crypto` or the type checker: a plain `z.string()` refusing a number is the library's test.
- A table left with one row becomes a plain `test`.

## Rules

- Never mock modules. `anti-slop/no-module-mocking` is a lint error, so drive pure modules and real interfaces instead.
- Never `await expect(promise).rejects...`. In bun:test the matcher returns `void` and blocks until the promise settles, so a failing matcher fails the test without `await`. The `await` trips the type-aware `await-thenable` lint error.
