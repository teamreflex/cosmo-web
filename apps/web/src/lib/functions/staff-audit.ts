import { staffMiddleware } from "@/lib/server/middlewares";
import {
  fetchAuditStaff,
  fetchStaffAudit,
} from "@/lib/server/staff-audit.server";
import { staffAuditQuerySchema } from "@/lib/universal/schema/staff-audit";
import { createServerFn } from "@tanstack/react-start";

/**
 * One page of the staff audit log, filtered by staff member and action.
 */
export const $fetchStaffAudit = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ audit: ["read"] })])
  .validator(staffAuditQuerySchema)
  .handler(({ data }) => fetchStaffAudit(data));

/**
 * The staff members the audit log can be filtered by.
 */
export const $fetchAuditStaff = createServerFn({ method: "GET" })
  .middleware([staffMiddleware({ audit: ["read"] })])
  .handler(() => fetchAuditStaff());
