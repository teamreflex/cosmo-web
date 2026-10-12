import * as z from "zod";

/**
 * One page of the link history. The search matches the start of a COSMO
 * username, an address or an Apollo username, like the admin pickers.
 */
export const cosmoLinkHistoryQuerySchema = z.object({
  search: z.string().min(3).optional(),
  cursor: z.number().int().optional(),
});

export type CosmoLinkHistoryQueryInput = z.infer<
  typeof cosmoLinkHistoryQuerySchema
>;
