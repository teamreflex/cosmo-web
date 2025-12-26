import * as z from "zod";
import type { EventType } from "@apollo/database/web/schema";

export const eventTypes: EventType[] = [
  "album",
  "showcase",
  "shop",
  "collaboration",
  "promotional",
  "anniversary",
  "tour",
  "other",
];

export const eventTypeSchema = z.enum([
  "album",
  "showcase",
  "shop",
  "collaboration",
  "promotional",
  "anniversary",
  "tour",
  "other",
]);

// Era schemas
export const createEraSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  name: z.string().min(1).max(128),
  description: z.string().optional(),
  artist: z.string().min(1).max(32),
  spotifyAlbumId: z.string().max(64).optional(),
  spotifyAlbumArt: z.url().max(255).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const updateEraSchema = createEraSchema.partial().extend({
  id: z.uuid(),
});

export type CreateEraInput = z.infer<typeof createEraSchema>;
export type UpdateEraInput = z.infer<typeof updateEraSchema>;

// Event schemas
export const createEventSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  name: z.string().min(1).max(128),
  description: z.string().optional(),
  artist: z.string().min(1).max(32),
  eventType: eventTypeSchema,
  eraId: z.uuid(),
  twitterUrl: z.url().max(255).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.uuid(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// Event collection schemas
export const eventCollectionSchema = z.object({
  collectionSlug: z.string().min(1).max(64),
  description: z.string().max(255).optional(),
  category: z.string().max(64).optional(),
});

export const addCollectionsToEventSchema = z.object({
  eventId: z.uuid(),
  collections: z.array(eventCollectionSchema).min(1),
});

export const removeCollectionFromEventSchema = z.object({
  eventId: z.uuid(),
  collectionSlug: z.string().min(1),
});

export type EventCollectionInput = z.infer<typeof eventCollectionSchema>;
export type AddCollectionsInput = z.infer<typeof addCollectionsToEventSchema>;
export type RemoveCollectionInput = z.infer<
  typeof removeCollectionFromEventSchema
>;

// Bulk import schema (paste slugs)
export const bulkCollectionImportSchema = z.preprocess((value) => {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(" :: ");
      return {
        collectionSlug: parts[0]?.trim() || "",
        description: parts[1]?.trim() || undefined,
        category: parts[2]?.trim() || undefined,
      };
    });
}, z.array(eventCollectionSchema));
