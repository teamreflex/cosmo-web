# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development

- `pnpm dev` - Start development server with Turbopack
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking

### Database

- `pnpm db:generate` - Generate migration files
- `pnpm db:migrate` - Run migrations
- `pnpm auth:generate` - Generate Better Auth schema

## Architecture Overview

### Tech Stack

- **Framework**: Next.js 15 with App Router and React Server Components
- **UI**: React 19, Tailwind v4, shadcn/ui components
- **State Management**: Zustand, TanStack Query for server state
- **Database**:
  - Neon PostgreSQL (main app database)
  - Blockchain indexer database (objekts, transfers, votes)
  - Drizzle ORM with relational queries
- **Authentication**: Better Auth with Discord/Twitter OAuth
- **Search**: Typesense for fuzzy objekt metadata search

### Project Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Reusable React components
- `src/lib/` - Core business logic
  - `client/` - Client-only utilities
  - `server/` - Server-side logic (database, API calls)
  - `universal/` - Shared types and Zod schemas
- `src/hooks/` - Custom React hooks
- `drizzle/` - Database migrations

### Key Architecture Patterns

1. **Data Fetching**: Uses server components with prefetching and streaming via TanStack Query
2. **Database Access**: Three separate connections:
   - `db` - Main Neon database (HTTP)
   - `dbi` - Interactive Neon connection (WebSocket for transactions)
   - `indexer` - Blockchain indexer database
3. **Error Handling**: Consistent use of Error Boundaries with Suspense
4. **URL State**: Managed with `nuqs` for shareable UI state

### Important Context

This is a blockchain explorer for MODHAUS' Cosmo app objekts and gravities. The platform tracks digital collectibles (objekts) and voting systems (gravities) on the blockchain. Key features include collection viewing, objekt metadata search, wishlists, progress tracking, and leaderboards.
