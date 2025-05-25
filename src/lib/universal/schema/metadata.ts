import { z } from "zod/v4";

export const metadataObjectSchema = z.object({
  collectionId: z.string().min(1),
  description: z.string().min(3).max(254),
});

export const metadataInputSchema = z.preprocess((value) => {
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [collectionId, description] = line.split(" :: ");
      return {
        collectionId: collectionId?.trim() || "",
        description: description?.trim() || "",
      };
    });
}, metadataObjectSchema.array());

export type MetadataRow = z.infer<typeof metadataObjectSchema>;
