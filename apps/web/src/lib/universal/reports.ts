import type { StaffUser } from "@/lib/universal/staff-users";
import type { Role } from "@apollo/auth";
import type {
  ReportReason,
  ReportStatus,
  ReportTargetType,
} from "@apollo/database/web/types";

/**
 * Escalated reports still wait on staff, so they count as open for the
 * one-report-per-target rule and the queue's open work.
 */
export const openReportStatuses = [
  "open",
  "escalated",
] as const satisfies readonly ReportStatus[];
export type OpenReportStatus = (typeof openReportStatuses)[number];

/**
 * What a queue row shows of the reported thing; null when it no longer
 * exists or its account is deleted. Later phases add messages, feedback and
 * trades.
 */
export type AdminReportRowTarget = {
  type: "user";
  user: StaffUser | null;
};

/**
 * The target types the staff queue can be filtered by; later phases add
 * theirs as their reports arrive.
 */
export const reportTargetTypeFilters = [
  "user",
] as const satisfies readonly (ReportTargetType &
  AdminReportRowTarget["type"])[];

/**
 * The reporter is null once their account is deleted.
 */
export type AdminReportRow = {
  id: string;
  reason: ReportReason;
  createdAt: Date;
  reporter: StaffUser | null;
  target: AdminReportRowTarget;
};

/**
 * A reported user as staff see them. `ban` is null unless a ban is in force;
 * a null `until` is permanent. A `protected` account has a verified email on a protected domain, so
 * nobody can ban, unban or re-role it; only viewers who can ban are told,
 * and everyone else gets null.
 */
export type ReportTargetUser = StaffUser & {
  id: string;
  role: Role;
  ban: { until: Date | null } | null;
  protected: boolean | null;
};

export type AdminReportDetailTarget = {
  type: "user";
  user: ReportTargetUser | null;
};

/**
 * Closed reports carry who closed them and when; the resolver is null once
 * their account is deleted.
 */
export type ReportOutcome =
  | { status: OpenReportStatus }
  | {
      status: "resolved" | "dismissed";
      resolvedAt: Date;
      resolver: StaffUser | null;
    };

export type AdminReportDetail = ReportOutcome & {
  id: string;
  reason: ReportReason;
  note: string | null;
  createdAt: Date;
  reporter: StaffUser | null;
  /** Open or escalated reports on the same target, besides this one. */
  otherOpenReportCount: number;
  target: AdminReportDetailTarget;
};

/**
 * The ban lengths staff pick from, as the admin plugin's `banExpiresIn`
 * seconds; a null length is permanent and omits it.
 */
export const banLengthOptions = [
  { value: "7d", seconds: 604_800 },
  { value: "30d", seconds: 2_592_000 },
  { value: "permanent", seconds: null },
] as const;
export type BanLength = (typeof banLengthOptions)[number]["value"];
