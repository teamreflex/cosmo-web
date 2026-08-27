import * as z from "zod";

export const metadataObjectSchema = z.object({
  collectionId: z.string().min(1),
  description: z.string().min(3).max(254),
});

export const metadataInputSchema = z
  .string()
  .catch("")
  .transform((value) =>
    value
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [collectionId, description] = line.split(" :: ");
        return {
          collectionId: collectionId?.trim() || "",
          description: description?.trim() || "",
        };
      }),
  )
  .pipe(metadataObjectSchema.array());

export type MetadataRow = z.infer<typeof metadataObjectSchema>;

export const bandUrlRowSchema = z.object({
  slug: z.string().min(1),
  bandImageUrl: z.string().min(1),
});

export const bandUrlInputSchema = z
  .string()
  .catch("")
  .transform((value) =>
    value
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [slug, bandImageUrl] = line.split(" :: ");
        return {
          slug: slug?.trim() || "",
          bandImageUrl: bandImageUrl?.trim() || "",
        };
      }),
  )
  .pipe(bandUrlRowSchema.array());

export type BandUrlRow = z.infer<typeof bandUrlRowSchema>;
