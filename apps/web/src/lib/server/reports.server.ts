import { env } from "@/lib/env/server";
import { db } from "@/lib/server/db";
import type { DbOrTx } from "@/lib/server/db";
import { recordStaffAudit } from "@/lib/server/staff-audit.server";
import {
  fetchStaffUsers,
  staffUser,
  staffUserFields,
} from "@/lib/server/staff-users.server";
import type { StaffUserRow } from "@/lib/server/staff-users.server";
import { tradeParty } from "@/lib/server/trades.server";
import { readTradeView } from "@/lib/server/trades/trade-view.server";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { openReportStatuses } from "@/lib/universal/reports";
import type {
  AdminReportDetail,
  AdminReportDetailTarget,
  AdminReportRow,
  AdminReportRowTarget,
  ReportOutcome,
  ReportTargetUser,
} from "@/lib/universal/reports";
import type {
  ReportCountsInput,
  ReportQueueInput,
} from "@/lib/universal/schema/reports";
import type { Role } from "@apollo/auth";
import { isBanActive, protectionFor } from "@apollo/auth/guard";
import {
  reportMessages,
  reports,
  tradeOffers,
} from "@apollo/database/web/schema";
import {
  liveTradeStatuses,
  type ReportStatus,
  type ReportTargetType,
} from "@apollo/database/web/types";
import {
  and,
  desc,
  EmptyFilter,
  eq,
  inArray,
  ne,
  not,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const QUEUE_PAGE_SIZE = 30;

/**
 * Reports on a staff member, or on a trade they're a party to or a message
 * in one, are hidden from them, whatever their role, so they never see who reported them or act
 * on their own dispute; other staff handle those. Relational reads alias the
 * table, so they pass theirs as `t`.
 */
function visibleTo(staffId: string, t: typeof reports = reports) {
  return not(aboutStaff(staffId, t));
}

function aboutStaff(staffId: string, t: typeof reports = reports) {
  const theirTrades = db
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(tradeParty(staffId));
  return or(
    and(eq(t.targetType, "user"), eq(t.targetId, staffId)),
    and(
      eq(t.targetType, "trade"),
      inArray(
        t.targetId,
        db
          .select({ id: sql<string>`${tradeOffers.id}::text` })
          .from(tradeOffers)
          .where(tradeParty(staffId)),
      ),
    ),
    // a message in one of their trades, theirs or the other party's
    and(
      eq(t.targetType, "message"),
      inArray(
        t.id,
        db
          .select({ id: reportMessages.reportId })
          .from(reportMessages)
          .where(inArray(reportMessages.tradeId, theirTrades)),
      ),
    ),
  );
}

/**
 * A trade report is a dispute, which closes only when staff complete, cancel
 * or extend its trade, never through resolve or dismiss: a dismissed dispute
 * would leave its trade frozen.
 */
const closableAsReport = ne(reports.targetType, "trade");

/**
 * The refusal for a report id a staff member may not see: it is about them
 * or their trade, or, for anything else, it doesn't exist.
 */
async function hiddenReportError(
  executor: DbOrTx,
  staffId: string,
  id: string,
) {
  const aboutYou = await executor.$count(
    reports,
    and(eq(reports.id, id), aboutStaff(staffId)),
  );
  return new ExpectedError(
    aboutYou > 0 ? "report_about_you" : "report_not_found",
  );
}

/**
 * Open and escalated counts of the reports the staff member may see,
 * optionally of one target type.
 */
export async function fetchReportCounts(
  staffId: string,
  input: ReportCountsInput,
) {
  const [counts] = await db
    .select({
      open: sql<number>`count(*) filter (where ${eq(reports.status, "open")})::int`.mapWith(
        Number,
      ),
      escalated:
        sql<number>`count(*) filter (where ${eq(reports.status, "escalated")})::int`.mapWith(
          Number,
        ),
    })
    .from(reports)
    .where(
      and(
        // redundant with the FILTERs, but keeps the status index in play
        inArray(reports.status, [...openReportStatuses]),
        visibleTo(staffId),
        input.targetType ? eq(reports.targetType, input.targetType) : undefined,
      ),
    );

  return counts ?? { open: 0, escalated: 0 };
}

/**
 * One page of the staff member's queue, newest first, keyset-paged on the
 * report id like the Listings feed: the cursor is the previous page's last
 * id, looked up whatever its status is now, so a report closed between
 * pages still marks the place. The page reads one row past its size to say
 * whether there's more.
 */
export async function fetchReportQueue(
  staffId: string,
  input: ReportQueueInput,
) {
  const { cursor } = input;
  const cursorRow = alias(reports, "cursor_row");
  const pageIds = db
    .select({ id: reports.id })
    .from(reports)
    .where(
      and(
        eq(reports.status, input.status),
        input.targetType === undefined
          ? undefined
          : eq(reports.targetType, input.targetType),
        visibleTo(staffId),
        cursor === undefined
          ? undefined
          : sql`(${reports.createdAt}, ${reports.id}) < (${db
              .select({ createdAt: cursorRow.createdAt, id: cursorRow.id })
              .from(cursorRow)
              .where(eq(cursorRow.id, cursor))})`,
      ),
    )
    .orderBy(desc(reports.createdAt), desc(reports.id))
    .limit(QUEUE_PAGE_SIZE + 1);
  const found = await db.query.reports.findMany({
    where: { RAW: (t) => inArray(t.id, pageIds) },
    columns: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc", id: "desc" },
    with: {
      reporter: staffUserFields,
    },
  });
  const rows = found.slice(0, QUEUE_PAGE_SIZE);

  const tradeIds = rows.flatMap((row) =>
    row.targetType === "trade" ? [row.targetId] : [],
  );
  const messageReportIds = rows.flatMap((row) =>
    row.targetType === "message" ? [row.id] : [],
  );
  const copyRows =
    messageReportIds.length === 0
      ? []
      : await db
          .select({
            reportId: reportMessages.reportId,
            tradeId: reportMessages.tradeId,
            senderId: reportMessages.senderId,
          })
          .from(reportMessages)
          .where(inArray(reportMessages.reportId, messageReportIds));
  const copies = new Map(copyRows.map((copy) => [copy.reportId, copy]));
  const [users, tradeRows] = await Promise.all([
    fetchStaffUsers([
      ...rows
        .filter((row) => row.targetType === "user")
        .map((row) => row.targetId),
      ...copyRows.flatMap((copy) =>
        copy.senderId === null ? [] : [copy.senderId],
      ),
    ]),
    tradeIds.length === 0
      ? []
      : db.query.tradeOffers.findMany({
          where: { id: { in: tradeIds }, kind: "trade" },
          columns: { id: true },
          with: { fromUser: staffUserFields, toUser: staffUserFields },
        }),
  ]);
  const trades = new Map(tradeRows.map((trade) => [trade.id, trade]));

  return {
    rows: rows.map((row): AdminReportRow => ({
      id: row.id,
      reason: row.reason,
      createdAt: row.createdAt,
      reporter: staffUser(row.reporter),
      target: toRowTarget(row, users, trades, copies),
    })),
    nextCursor: found.length > rows.length ? rows.at(-1)?.id : undefined,
  };
}

function toRowTarget(
  {
    id,
    targetType,
    targetId,
  }: { id: string; targetType: ReportTargetType; targetId: string },
  users: Map<string, StaffUserRow>,
  trades: Map<
    string,
    { id: string; fromUser: StaffUserRow | null; toUser: StaffUserRow | null }
  >,
  copies: Map<string, { tradeId: string; senderId: string | null }>,
): AdminReportRowTarget {
  switch (targetType) {
    case "user":
      return { type: "user", user: staffUser(users.get(targetId) ?? null) };
    case "trade": {
      const trade = trades.get(targetId);
      return {
        type: "trade",
        trade:
          trade === undefined
            ? null
            : {
                id: trade.id,
                from: staffUser(trade.fromUser),
                to: staffUser(trade.toUser),
              },
      };
    }
    case "message": {
      const copy = copies.get(id);
      return {
        type: "message",
        message:
          copy === undefined
            ? null
            : {
                tradeId: copy.tradeId,
                sender: staffUser(
                  copy.senderId === null
                    ? null
                    : (users.get(copy.senderId) ?? null),
                ),
              },
      };
    }
    case "feedback":
      throw new Error(`Reports on ${targetType} targets aren't supported yet`);
  }
}

/**
 * A report with everything staff need to act on it. Throws
 * `report_about_you` for a report on the viewer and `report_not_found` for an
 * unknown id.
 */
export async function fetchReportDetail(
  viewer: { id: string; role: Role },
  id: string,
): Promise<AdminReportDetail> {
  const report = await db.query.reports.findFirst({
    where: {
      id,
      RAW: (t) => visibleTo(viewer.id, t) ?? EmptyFilter,
    },
    with: {
      reporter: staffUserFields,
      resolver: staffUserFields,
    },
  });

  if (!report) {
    throw await hiddenReportError(db, viewer.id, id);
  }

  return {
    ...toOutcome(report),
    id: report.id,
    reason: report.reason,
    note: report.note,
    createdAt: report.createdAt,
    reporter: staffUser(report.reporter),
    otherOpenReportCount: await db.$count(
      reports,
      and(
        eq(reports.targetType, report.targetType),
        eq(reports.targetId, report.targetId),
        inArray(reports.status, [...openReportStatuses]),
        ne(reports.id, report.id),
      ),
    ),
    target: await fetchDetailTarget(viewer.role, report),
  };
}

async function fetchDetailTarget(
  viewerRole: Role,
  {
    id,
    targetType,
    targetId,
  }: {
    id: string;
    targetType: ReportTargetType;
    targetId: string;
  },
): Promise<AdminReportDetailTarget> {
  switch (targetType) {
    case "user":
      return {
        type: "user",
        user: await fetchTargetUser(viewerRole, targetId),
      };
    case "trade": {
      const party = {
        columns: { ...staffUserFields.columns, banned: true, banExpires: true },
        with: staffUserFields.with,
      } as const;
      const [read, trade] = await Promise.all([
        readTradeView(targetId),
        db.query.tradeOffers.findFirst({
          where: { id: targetId, kind: "trade" },
          columns: { disputeReportId: true },
          with: { fromUser: party, toUser: party },
        }),
      ]);

      if (read === null || !trade) {
        return { type: "trade", trade: null };
      }

      const named = (user: typeof trade.fromUser) =>
        user === null
          ? null
          : { ...staffUser(user), banActive: isBanActive(user) };

      return {
        type: "trade",
        trade: {
          view: read.trade,
          from: named(trade.fromUser),
          to: named(trade.toUser),
          current: trade.disputeReportId === id,
        },
      };
    }
    case "message": {
      const copy = await db.query.reportMessages.findFirst({
        where: { reportId: id },
        columns: {
          messageId: true,
          tradeId: true,
          senderId: true,
          sentAt: true,
        },
      });
      if (!copy) {
        return { type: "message", message: null };
      }

      const [sender, read, message] = await Promise.all([
        copy.senderId === null
          ? null
          : fetchTargetUser(viewerRole, copy.senderId),
        readTradeView(copy.tradeId),
        db.query.tradeMessages.findFirst({
          where: { id: copy.messageId },
          columns: { removedAt: true },
        }),
      ]);
      const trade = read?.trade ?? null;
      const side = (["from", "to"] as const).find(
        (party) =>
          copy.senderId !== null &&
          trade?.parties[party].user?.id === copy.senderId,
      );
      return {
        type: "message",
        message: {
          id: copy.messageId,
          sentAt: copy.sentAt,
          side: side ?? null,
          sender,
          removed: message !== undefined && message.removedAt !== null,
          trade,
        },
      };
    }
    case "feedback":
      throw new Error(`Reports on ${targetType} targets aren't supported yet`);
  }
}

/**
 * A reported user, or a reported message's sender, as staff act on them;
 * null once their account is deleted.
 */
async function fetchTargetUser(
  viewerRole: Role,
  userId: string,
): Promise<ReportTargetUser | null> {
  const [user, liveTradeCount] = await Promise.all([
    db.query.user.findFirst({
      where: { id: userId },
      columns: {
        id: true,
        ...staffUserFields.columns,
        email: true,
        emailVerified: true,
        role: true,
        banned: true,
        banExpires: true,
      },
      with: staffUserFields.with,
    }),
    db.$count(
      tradeOffers,
      and(
        eq(tradeOffers.kind, "trade"),
        inArray(tradeOffers.status, [...liveTradeStatuses]),
        tradeParty(userId),
      ),
    ),
  ]);

  if (!user) {
    return null;
  }

  return {
    ...staffUser(user),
    id: user.id,
    role: user.role,
    ban: isBanActive(user) ? { until: user.banExpires } : null,
    liveTradeCount,
    protected: protectionFor(viewerRole, user, env.PROTECTED_EMAIL_DOMAINS),
  };
}

function toOutcome(report: {
  id: string;
  status: ReportStatus;
  resolvedAt: Date | null;
  resolver: StaffUserRow | null;
}): ReportOutcome {
  switch (report.status) {
    case "open":
    case "escalated":
      return { status: report.status };
    case "resolved":
    case "dismissed":
      // reports_resolved_chk ties resolved_at to the closed statuses
      if (report.resolvedAt === null) {
        throw new Error(`Report ${report.id} is closed without resolved_at`);
      }
      return {
        status: report.status,
        resolvedAt: report.resolvedAt,
        resolver: staffUser(report.resolver),
      };
  }
}

type ReportAction = "report:resolve" | "report:dismiss" | "report:escalate";

type ReportTransition = {
  from: ReportStatus[];
  set: Partial<typeof reports.$inferInsert>;
};

/**
 * The statuses an action may leave and the columns it sets.
 */
function reportTransition(
  action: ReportAction,
  staffId: string,
): ReportTransition {
  switch (action) {
    case "report:resolve":
    case "report:dismiss":
      return {
        from: [...openReportStatuses],
        set: {
          status: action === "report:resolve" ? "resolved" : "dismissed",
          resolvedBy: staffId,
          resolvedAt: new Date(),
        },
      };
    case "report:escalate":
      return { from: ["open"], set: { status: "escalated" } };
  }
}

/**
 * Moves a report to its next status and audits the action in one
 * transaction. The status guard turns a lost race into
 * `report_status_changed` instead of overwriting another staff member, and a
 * report on the staff member is refused as it is for reads. A trade report
 * can be escalated, but only settling its trade resolves it.
 */
export async function transitionReport(
  staffId: string,
  id: string,
  action: ReportAction,
) {
  const { from, set } = reportTransition(action, staffId);

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(reports)
      .set(set)
      .where(
        and(
          eq(reports.id, id),
          inArray(reports.status, from),
          visibleTo(staffId),
          action === "report:escalate" ? undefined : closableAsReport,
        ),
      )
      .returning({ id: reports.id });

    if (!updated) {
      const [report] = await tx
        .select({ targetType: reports.targetType })
        .from(reports)
        .where(and(eq(reports.id, id), visibleTo(staffId)));
      if (!report) throw await hiddenReportError(tx, staffId, id);
      throw new ExpectedError(
        report.targetType === "trade" && action !== "report:escalate"
          ? "report_trade_dispute"
          : "report_status_changed",
      );
    }

    await recordStaffAudit(tx, { staffId, action, reportId: id });
  });
}

/**
 * Resolves every open report on a target, auditing each one, as a ban
 * started from a report does for its user.
 */
export async function resolveTargetReports(
  tx: DbOrTx,
  staffId: string,
  targetType: ReportTargetType,
  targetId: string,
) {
  const { from, set } = reportTransition("report:resolve", staffId);

  const resolved = await tx
    .update(reports)
    .set(set)
    .where(
      and(
        eq(reports.targetType, targetType),
        eq(reports.targetId, targetId),
        inArray(reports.status, from),
      ),
    )
    .returning({ id: reports.id });

  await recordStaffAudit(
    tx,
    resolved.map((report) => ({
      staffId,
      action: "report:resolve",
      reportId: report.id,
    })),
  );
}
