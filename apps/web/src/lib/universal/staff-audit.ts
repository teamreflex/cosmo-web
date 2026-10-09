import type { Role } from "@apollo/auth";
import type {
  ReportStatus,
  StaffAuditAction,
} from "@apollo/database/web/types";

/**
 * What an audit row acted on. A user's username, and an API key owner's, is
 * null once their account is deleted. An API key's name and enabled state are
 * as they were when the action ran.
 */
export type AdminAuditTarget =
  | { type: "user"; id: string; username: string | null }
  | { type: "report"; id: string }
  | {
      type: "api-key";
      id: string;
      name: string | null;
      owner: string | null;
      enabled: boolean;
    }
  | { type: "collection"; slug: string };

/**
 * The parts of an audit row's stored detail that the log shows, with roles
 * parsed. A null `expiresIn` is a permanent ban.
 */
export type AdminAuditDetail =
  | { kind: "ban"; expiresIn: number | null }
  | { kind: "set-role"; from: Role; to: Role };

/**
 * `report` is the linked report, with its current status so a link to it
 * opens the matching queue tab; null when there is none or it was deleted.
 * The staff member's username is null once their account is deleted.
 */
export type AdminAuditRow = {
  id: number;
  createdAt: Date;
  action: StaffAuditAction;
  staff: { username: string | null; role: Role };
  report: { id: string; status: ReportStatus } | null;
  detail: AdminAuditDetail | null;
  target: AdminAuditTarget;
};

/**
 * A null username is a deleted staff member.
 */
export type AuditStaffMember = {
  id: string;
  username: string | null;
};
