import { db } from "@/lib/server/db";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { eras, events } from "@apollo/database/web/schema";
import { and, eq, ne } from "drizzle-orm";

/**
 * Validates that a slug is unique for eras.
 */
export async function validateEraSlug(slug: string, excludeId?: string) {
  const count = await db.$count(
    eras,
    excludeId
      ? and(eq(eras.slug, slug), ne(eras.id, excludeId))
      : eq(eras.slug, slug),
  );

  if (count > 0) {
    throw new ExpectedError("era_slug_taken");
  }
}

/**
 * Validates that a slug is unique for events.
 */
export async function validateEventSlug(slug: string, excludeId?: string) {
  const count = await db.$count(
    events,
    excludeId
      ? and(eq(events.slug, slug), ne(events.id, excludeId))
      : eq(events.slug, slug),
  );

  if (count > 0) {
    throw new ExpectedError("event_slug_taken");
  }
}
