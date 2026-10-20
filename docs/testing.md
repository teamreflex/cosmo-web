# Testing

Tests run with `bun test` via `turbo test`.

## What earns a test

A test earns its place by guarding pure logic that is easy to break and hard to notice in the browser: the trade lifecycle and holdings allocator in `packages/trades`, the drain's transfer decisions, serial arithmetic, account guards and role matrices, grid and COMO calendar maths, and input parsing that refuses hostile values. There are no database or server-function integration tests, and no mocked COSMO or HTTP responses. `apps/chat` is the exception: it is pure Effect, so its suite drives the real handlers over an in-memory store (see `apps/chat/CLAUDE.md`). For anything a person would see on the page (copy, layout, which panel renders, formatting), check it with browser QA instead of writing a test.

## Rejection assertions are synchronous

In bun:test, `expect(promise).rejects.toX()` returns `void` and blocks synchronously — Bun drains the event loop until the promise settles, so a failing matcher fails the test without `await`, and assertions on the following lines see post-settlement state. This differs from vitest/jest.

Never write `await expect(...).rejects...`: the typed return is `void`, so the `await` trips the type-aware `await-thenable` lint error (and TS hint 80007).
