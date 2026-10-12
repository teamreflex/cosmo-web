import { staffAuditActions } from "@apollo/database/web/types";
import * as z from "zod";

export const staffAuditFiltersSchema = z.object({
  staffId: z.string().min(1).optional(),
  action: z.enum(staffAuditActions).optional(),
});

export const staffAuditQuerySchema = staffAuditFiltersSchema.extend({
  cursor: z.number().int().optional(),
});

export type StaffAuditFilters = z.infer<typeof staffAuditFiltersSchema>;
export type StaffAuditQueryInput = z.infer<typeof staffAuditQuerySchema>;
