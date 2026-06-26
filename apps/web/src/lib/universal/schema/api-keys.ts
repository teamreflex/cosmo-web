import * as z from "zod";

export const searchUsersSchema = z.object({
  query: z.string().min(3),
});

export const createApiKeySchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(32),
  // null = never expires; otherwise constrained to the plugin's default 1..365 day window
  expiresInDays: z.number().int().min(1).max(365).nullable(),
});

export const updateApiKeySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(32),
  enabled: z.boolean(),
});

export const deleteApiKeySchema = z.object({
  id: z.string().min(1),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
