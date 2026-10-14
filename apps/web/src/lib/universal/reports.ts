import type { StaffUser } from "@/lib/universal/staff-users";
import type { TradeView } from "@/lib/universal/trades";
import type { Role } from "@apollo/auth";
import type {
  ReportStatus,
  ReportTargetType,
  StoredReportReason,
  TradeSide,
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
 * What a queue row shows of the reported thing: a user, the trade a dispute
 * is about with its parties, or a chat message's sender and trade. Each user
 * is null once their account is deleted, a trade once it is gone, and a
 * message once its report's copy is.
 */
export type AdminReportRowTarget =
  | { type: "user"; user: StaffUser | null }
  | {
      type: "trade";
      trade: {
        id: string;
        from: StaffUser | null;
        to: StaffUser | null;
      } | null;
    }
  | {
      type: "message";
      message: { tradeId: string; sender: StaffUser | null } | null;
    };

/**
 * The target types the staff queue can be filtered by, one per row target.
 */
export const reportTargetTypeFilters = [
  "user",
  "trade",
  "message",
] as const satisfies readonly (ReportTargetType &
  AdminReportRowTarget["type"])[];

/**
 * The reporter is null once their account is deleted.
 */
export type AdminReportRow = {
  id: string;
  reason: StoredReportReason;
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
  /** Accepted and disputed trades, which a ban leaves on hold for staff. */
  liveTradeCount: number;
};

/**
 * A disputed trade's party as staff see them, and whether a ban is in force
 * on them; null once their account is deleted.
 */
export type ReportTradeParty = StaffUser & { banActive: boolean };

/**
 * The trade a dispute is about. `current` says the report is still the
 * trade's dispute, which staff settle by completing, cancelling or extending
 * the trade.
 */
export type ReportTargetTrade = {
  view: TradeView;
  from: ReportTradeParty | null;
  to: ReportTradeParty | null;
  current: boolean;
};

/**
 * A reported chat message as the web app knows it: never its text, which
 * staff read from the report's own copy through chat. `sender` is the user
 * staff can ban; `side` places them in the trade, which is null once gone.
 */
export type ReportTargetMessage = {
  id: number;
  sentAt: Date;
  side: TradeSide | null;
  sender: ReportTargetUser | null;
  // staff removed it from the chat since it was reported
  removed: boolean;
  trade: TradeView | null;
};

export type AdminReportDetailTarget =
  | { type: "user"; user: ReportTargetUser | null }
  | { type: "trade"; trade: ReportTargetTrade | null }
  | { type: "message"; message: ReportTargetMessage | null };

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
  reason: StoredReportReason;
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
