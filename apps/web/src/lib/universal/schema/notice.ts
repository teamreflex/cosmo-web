import * as z from "zod";

export const noticeSchema = z.object({
  message: z.string().max(500),
});
