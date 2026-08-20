This is a Turborepo monorepo for the Apollo project.

## Documentation

Detailed conventions live in `docs/`. Read the relevant file **before** working in that area:

| When you're working on…                                                                          | Read                                     |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Database queries, schema, migrations, derived/projection types (`apps/web`, `packages/database`) | [`docs/database.md`](docs/database.md)   |
| Routes, loaders, data fetching, server functions, import protection (`apps/web`)                 | [`docs/tanstack.md`](docs/tanstack.md)   |
| Components, forms, Tailwind/styling, i18n strings (`apps/web`)                                   | [`docs/frontend.md`](docs/frontend.md)   |
| Throwing/handling errors, `ExpectedError`, Sentry filtering (`apps/web`)                         | [`docs/errors.md`](docs/errors.md)       |
| Better Auth config, API keys, auth schema generation (`apps/web`)                                | [`docs/auth.md`](docs/auth.md)           |
| Looking up library documentation (TanStack, Drizzle, Effect, …)                                  | [`docs/libraries.md`](docs/libraries.md) |

## Development

### Core Commands

- `turbo dev` - Start development server
- `turbo build` - Build the entire monorepo
- `turbo lint` - Run linting across all packages
- `turbo lint:fix` - Fix lint issues automatically
- `turbo format` - Format code across all packages
- `turbo typecheck` - TypeScript type checking for all packages
- `turbo test` - Run tests across all packages

### Turborepo

- This is a [Bun](https://bun.sh/) monorepo. Do not use npm/pnpm.
- Use `turbo <command>` to run commands across packages
- You can append a turbo command with `--filter <package>` to run the command for only one app/package.
  - For example, typecheck only the web app: `turbo typecheck --filter web`, or only the util package: `turbo typecheck --filter @apollo/util`
- Turbo handles dependency management and parallel execution
- By default Turborepo will run in TUI mode. Use the `--ui stream` flag to disable this and get the outputs from all packages as a single stream.

### Workflow

- Linting and type checking is sufficient, you do not need to run the build or dev commands to test your work.
- When dealing with new packages, always check `package.json` to see if it has already been installed.
- When installing packages with `bun add` from the root, pass `--filter <workspace>` to target a workspace (e.g., `bun add package-name --filter web`). Running `bun add` from the root without `--filter` adds the package to the root `package.json`. Use `bun add package-name --catalog` to add a package to the root catalog instead.
- The project uses [oxlint](https://oxc.rs/docs/guide/usage/linter.html) instead of eslint, and [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) instead of Prettier. Do not manually use eslint or Prettier.
- oxlint `extends` **overwrites** the `plugins` array (no merge). The shared base config (`packages/lint`) intentionally omits `react`; `apps/web` enables it and must therefore repeat the full plugin set `["typescript", "react", "import", "unicorn"]` — trimming it to `["react"]` silently drops the rest.
- Typecheck scripts run plain `tsc` everywhere using the native TypeScript 7 from the root catalog. TS7 supports the TypeORM decorator emit (`experimentalDecorators` + metadata) that `apps/indexer` relies on, but has no compiler API — don't introduce tooling that imports `typescript` and calls `createProgram()`/`emit()`.

### Project Structure

#### Apps

- `apps/web`: Core TanStack Start web app
- `apps/indexer`: Subsquid blockchain indexer for cataloging Modhaus objekt collections
- `apps/schedules`: Functions for executing scheduled tasks
- `apps/typesense`: Dockerfile for building Typesense with `curl` available
- `apps/typesense-import`: Sync new objekt collections to the Typesense database
- `apps/proxy`: mitmproxy addons for intercepting COSMO app traffic

#### Packages

- `packages/cosmo`: COSMO related types and API functions
- `packages/database`: `drizzle-orm` schemas for both databases
- `packages/drizzle-bun-effect`: Effect service for Bun.SQL, derived from `drizzle-orm/effect-postgres`
- `packages/lint`: Shared oxlint config
- `packages/typescript`: Shared tsconfig.json file
- `packages/util`: Shared utility functions
- `packages/util-server`: Shared server-only utilities (Redis cache keys, crypto)

## Project Context

Apollo is a blockchain explorer for MODHAUS' COSMO app objekts and gravities. The platform tracks digital collectibles (objekts) and voting systems (gravities) via on-chain data.

We do not provide authenticated access to COSMO APIs by allowing users to login with their own accounts. We have a database table containing access and refresh tokens for a dummy account that allows us to proxy authenticated access to specific APIs required for operation. These APIs are:

- fetching artist + member information
- fetching gravity polls for candidate lists
- providing user search
- verifying user account ownership by reading profiles

### Concepts

A `collection` represents a type of objekt. Certain properties on a collection are:

- the group it belongs to, ie; tripleS, ARTMS
- the member it is, ie: Seoyeon, Heejin
- the season it is part of, ie: Atom01, Binary01, Cream01
- the class of objekt, ie: First, Double, Special, Premier, Welcome
- the number, ie: 101Z, 201Z, 320Z, 401A
  - the suffix is one of two letters: Z or A. Z denotes it's a digital only objekt, A denotes it's a physical objekt
  - the first number can inform the class: 1 is either Welcome or First class, 2 is Special class, 3 is Double class, 4 is Premier class
  - Welcome class objekts are always 100Z

An `objekt` is a singular NFT on the Abstract blockchain. Every objekt within a unique collection has a unique serial number

A `grid` is when a user collects all 8 (or 4) First class objekts for a member, segmented by season and then further segmented by edition.

- 1st edition corresponds to First class collection numbers 101 through 108 and Special class collection numbers 201 & 202
- 2nd edition corresponds to First class collection numbers 109 through 116 and Special class collection numbers 203 & 204
- 3rd edition corresponds to First class collection numbers 117 though 120 and Special class collection numbers 205 & 206
- Completing a grid locks the selected First class objekts to your account, and randomly grants you one of two corresponding Special class objekts
- Completing a grid with physical (designated A) objekts does not grant an A designation Special class, only a Z designation
- Untransferable or unsendable objekts cannot be used to complete a grid
- Exceptions to this rule are as follows:
  - tripleS Atom01 2nd edition Special class objekts were designated as 216 & 217
  - tripleS Atom01 3rd edition Special class objekts were designated as 218 & 219

`COMO` is the currency used for voting in `gravity` events. Every objekt purchase grants some value of this, and objekts of `Special` class generate 1 COMO per month. We track COMO balances of every account via blockchain events.

Gravity events are polls where users can place their COMO on specific candidates. Usually these range from things such as voting for a song to release, or which members will participate in a specific group sub-unit. We provide live voting data by tracking `Voted` events on-chain, and merge in which candidate was selected per vote by tracking `Reveal` events.
