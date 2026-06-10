import type { FetchError } from "ofetch";
import { z } from "zod";

// known COSMO API error responses, discriminated by code.
export const cosmoErrorSchema = z.object({
  error: z.discriminatedUnion("code", [
    z.object({
      code: z.literal("OBJEKT_NOT_FOUND"),
      message: z.string(),
    }),
  ]),
});

export type CosmoError = z.infer<typeof cosmoErrorSchema>["error"];

/**
 * Extract a known COSMO error from a failed request's response body, if it
 * matches one. An unrecognized body returns undefined.
 */
export function parseCosmoError(error: FetchError): CosmoError | undefined {
  const result = cosmoErrorSchema.safeParse(error.data);
  return result.success ? result.data.error : undefined;
}
