# Library Documentation Lookup

How to find current documentation for libraries used in this repo. Prefer these sources over training knowledge — they reflect current APIs, and several of these libraries (Drizzle, TanStack Start, Tailwind v4) have changed significantly.

## Dedicated tools

| Library | How to look up docs |
| --- | --- |
| TanStack Start / Router / Query / Virtual | `bunx @tanstack/cli search-docs "<query>" --json` (narrow with `--library <id>`, `--limit <n>`) |
| Bun | bun docs MCP (`mcp__bun__*` tools) |
| shadcn/ui | From `apps/web`: `bun run shadcn search <query>`, `bun run shadcn view <item>`, `bun run shadcn docs <component>` |
| Postgres | planetscale plugin skills (`planetscale:postgres`) |
| Sentry | sentry MCP |

## llms.txt (via WebFetch)

| Library | URL |
| --- | --- |
| Better Auth | https://better-auth.com/llms.txt |
| Drizzle ORM | https://orm.drizzle.team/llms.txt |
| Zod | https://zod.dev/llms.txt |
| Motion | https://motion.dev/llms.txt |
| Turborepo | https://turborepo.com/llms.txt |
| Subsquid | https://docs.sqd.ai/llms.txt |
| shadcn/ui | https://ui.shadcn.com/llms.txt |

## Everything else

Effect, Tailwind v4, Typesense, Paraglide JS, TypeORM, react-hook-form, Radix UI, and anything not listed above: use the context7 MCP (`resolve-library-id` → `query-docs`). oxlint/oxfmt docs live at https://oxc.rs.
