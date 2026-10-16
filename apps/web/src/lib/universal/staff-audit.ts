import type { StaffUser } from "@/lib/universal/staff-users";
import type { Role } from "@apollo/auth";
import type {
  ReportStatus,
  StaffAuditAction,
} from "@apollo/database/web/types";

/**
 * What an audit row acted on. A target user and an API key's owner are null
 * once that account is deleted. An API key's name and enabled state are as
 * they were when the action ran. A trade is named by its id only, and a
 * rating by its id and its trade.
 */
export type AdminAuditTarget =
  | { type: "user"; id: string; user: StaffUser | null }
  | { type: "report"; id: string }
  | {
      type: "api-key";
      id: string;
      name: string | null;
      owner: StaffUser | null;
      enabled: boolean;
    }
  | { type: "collection"; slug: string }
  | { type: "trade"; id: string }
  | { type: "message"; id: string; tradeId: string }
  | { type: "feedback"; id: string; tradeId: string };

/**
 * The parts of an audit row's stored detail that the log shows, with roles
 * parsed. A null `expiresIn` is a permanent ban, and `deadlineAt` is the
 * deadline a trade extension gave.
 */
export type AdminAuditDetail =
  | { kind: "ban"; expiresIn: number | null }
  | { kind: "set-role"; from: Role; to: Role }
  | { kind: "trade-extend"; deadlineAt: Date; hours: number };

/**
 * `report` is the linked report, with its current status so a link to it
 * opens the matching queue tab; null when there is none or it was deleted.
 * `staff` is null once the staff member's account is deleted.
 */
export type AdminAuditRow = {
  id: number;
  createdAt: Date;
  action: StaffAuditAction;
  staff: (StaffUser & { role: Role }) | null;
  report: { id: string; status: ReportStatus } | null;
  detail: AdminAuditDetail | null;
  target: AdminAuditTarget;
};

/**
 * A null user is a deleted staff member.
 */
export type AuditStaffMember = {
  id: string;
  user: StaffUser | null;
};
