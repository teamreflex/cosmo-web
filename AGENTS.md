This is a Turborepo monorepo for the Apollo project.

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

- Linting and type checking is sufficent, you do not need to run the build or dev commands to test your work.
- When dealing with new packages, always check `package.json` to see if it has already been installed.
- When installing packages with `bun add`, you must run the command from the specific workspace directory (e.g., `cd apps/web && bun add package-name`). Bun does not support a `--filter` flag like other package managers. Running `bun add` from the root will add the package to the root `package.json` instead of the workspace.

### Project Structure

#### Apps

- `apps/web`: Core TanStack Start web app
- `apps/indexer`: Subsquid blockchain indexer for cataloging Modhaus objekt collections
- `apps/schedules`: Functions for executing scheduled tasks
- `apps/typesense`: Dockerfile for building Typesense with `curl` available
- `apps/typesense-import`: Sync new objekt collections to the Typesense database

#### Packages

- `packages/cosmo`: COSMO related types and API functions
- `packages/database`: `drizzle-orm` schemas for both databases
- `packages/eslint`: Shared ESLint config
- `packages/typescript`: Shared tsconfig.json file
- `packages/util`: Shared utility functions

## Project Context

Apollo is a blockchain explorer for MODHAUS' Cosmo app objekts and gravities. The platform tracks digital collectibles (objekts) and voting systems (gravities) on the blockchain.

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
