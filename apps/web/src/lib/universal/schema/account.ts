import * as z from "zod";

/**
 * How the caller proves they own the account they're deleting: the token from
 * the emailed link, or, for an account without a deliverable email, a recent
 * sign-in.
 */
export const deletionProofSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("email"), token: z.string().min(1) }),
  z.object({ kind: z.literal("fresh-session") }),
]);

export type DeletionProof = z.infer<typeof deletionProofSchema>;
