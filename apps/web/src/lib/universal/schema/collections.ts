import { m } from "@/i18n/messages";
import { validOnlineTypes } from "@apollo/cosmo/types/common";
import * as z from "zod";

const colorSchema = z.string().max(8);

export const collectionLookupSchema = z.object({
  season: z.string().min(1),
  member: z.string().min(1),
  collectionNo: z.string().min(1),
});

export type CollectionLookupInput = z.infer<typeof collectionLookupSchema>;

export const updateCollectionSchema = z
  .object({
    id: z.uuid(),
    artist: z.string().min(1).max(32),
    member: z.string().min(1).max(32),
    members: z.array(z.string().trim().min(1).max(32)).min(1).max(8),
    season: z.string().min(1).max(32),
    class: z.string().min(1).max(8),
    collectionNo: z.string().min(1).max(8),
    textColor: colorSchema,
    backgroundColor: colorSchema,
    accentColor: colorSchema,
    onOffline: z.enum(validOnlineTypes),
    hasAudio: z.boolean(),
    unobtainable: z.boolean(),
    frontMedia: z.string().max(255).nullable(),
  })
  // member filters read members, so it must name the member the rest of the app shows
  .refine((data) => data.members.includes(data.member), {
    path: ["members"],
    error: () => m.admin_collection_members_missing_member(),
  });

export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>;
