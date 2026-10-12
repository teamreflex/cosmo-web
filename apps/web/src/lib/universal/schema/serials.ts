import * as z from "zod";

const tokenIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Token ID must be numeric");

export const confirmSerialSchema = z.object({
  tokenId: tokenIdSchema,
  serial: z.number().int().positive(),
});

export const deleteSerialConfirmationSchema = z.object({
  tokenId: tokenIdSchema,
});

export type ConfirmSerialInput = z.infer<typeof confirmSerialSchema>;
