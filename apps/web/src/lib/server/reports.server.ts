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
  cosmoAccounts,
  reportMessages,
  reports,
  tradeFeedback,
  tradeMessages,
  tradeOffers,
  type user,
} from "@apollo/database/web/schema";
import {
  type FeedbackRating,
  liveTradeStatuses,
  type ReportStatus,
  type ReportTargetType,
} from "@apollo/database/web/types";
import {
  and,
  count,
  desc,
  EmptyFilter,
  eq,
  exists,
  inArray,
  ne,
  not,
  or,
  sql,
} from "drizzle-orm";
import { alias, type AnyPgColumn } from "drizzle-orm/pg-core";

const QUEUE_PAGE_SIZE = 30;

/**
 * Reports on a staff member, or on a trade they're a party to or a message
 * or rating in one, are hidden from them, whatever their role, so they never
 * see who reported them or act on their own dispute; other staff handle
 * those. Relational reads alias the table, so they pass theirs as `t`.
 */
function visibleTo(staffId: string, t: typeof reports = reports) {
  return not(aboutStaff(staffId, t));
}

function aboutStaff(staffId: string, t: typeof reports = reports) {
  const theirTrades = db
    .select({ id: tradeOffers.id })
    .from(tradeOffers)
    .where(tradeParty(staffId));
  /**
   * The address they link now, which their trades and ratings keep after
   * they delete their account, so relinking the same COSMO account doesn't
   * show them reports about their old trades. Those reports are checked
   * through their own target by primary key, since no index finds trades by
   * address.
   */
  const theirAddress = db
    .select({ address: cosmoAccounts.address })
    .from(cosmoAccounts)
    .where(eq(cosmoAccounts.userId, staffId));
  const pinned = (from: AnyPgColumn, to: AnyPgColumn) =>
    or(inArray(from, theirAddress), inArray(to, theirAddress));
  // the target's id as a uuid, cast only for the types whose ids are uuids
  const targetUuid = (type: ReportTargetType) =>
    sql`case when ${t.targetType} = ${type} then ${t.targetId}::uuid end`;

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
    // a rating in one of their trades, theirs or the other party's
    and(
      eq(t.targetType, "feedback"),
      inArray(
        t.targetId,
        db
          .select({ id: sql<string>`${tradeFeedback.id}::text` })
          .from(tradeFeedback)
          .where(inArray(tradeFeedback.tradeId, theirTrades)),
      ),
    ),
    // a trade, message or rating pinned to the address they link now
    and(
      eq(t.targetType, "trade"),
      exists(
        db
          .select({ id: tradeOffers.id })
          .from(tradeOffers)
          .where(
            and(
              eq(tradeOffers.id, targetUuid("trade")),
              pinned(tradeOffers.fromAddress, tradeOffers.toAddress),
            ),
          ),
      ),
    ),
    and(
      eq(t.targetType, "message"),
      exists(
        db
          .select({ id: reportMessages.reportId })
          .from(reportMessages)
          .innerJoin(tradeOffers, eq(tradeOffers.id, reportMessages.tradeId))
          .where(
            and(
              eq(reportMessages.reportId, t.id),
              pinned(tradeOffers.fromAddress, tradeOffers.toAddress),
            ),
          ),
      ),
    ),
    and(
      eq(t.targetType, "feedback"),
      exists(
        db
          .select({ id: tradeFeedback.id })
          .from(tradeFeedback)
          .where(
            and(
              eq(tradeFeedback.id, targetUuid("feedback")),
              pinned(tradeFeedback.fromAddress, tradeFeedback.toAddress),
            ),
          ),
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
  const feedbackIds = rows.flatMap((row) =>
    row.targetType === "feedback" ? [row.targetId] : [],
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
  const users = await fetchStaffUsers([
    ...rows
      .filter((row) => row.targetType === "user")
      .map((row) => row.targetId),
    ...copyRows.flatMap((copy) =>
      copy.senderId === null ? [] : [copy.senderId],
    ),
  ]);
  const tradeRows =
    tradeIds.length === 0
      ? []
      : await db.query.tradeOffers.findMany({
          where: { id: { in: tradeIds }, kind: "trade" },
          columns: { id: true },
          with: { fromUser: staffUserFields, toUser: staffUserFields },
        });
  const feedbackRows =
    feedbackIds.length === 0
      ? []
      : await db.query.tradeFeedback.findMany({
          where: { id: { in: feedbackIds } },
          columns: { id: true, rating: true },
          with: { fromUser: staffUserFields, toUser: staffUserFields },
        });
  const trades = new Map(tradeRows.map((trade) => [trade.id, trade]));
  const feedback = new Map(feedbackRows.map((row) => [row.id, row]));

  return {
    rows: rows.map((row): AdminReportRow => ({
      id: row.id,
      reason: row.reason,
      createdAt: row.createdAt,
      reporter: staffUser(row.reporter),
      target: toRowTarget(row, users, trades, copies, feedback),
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
  feedback: Map<
    string,
    {
      rating: FeedbackRating;
      fromUser: StaffUserRow | null;
      toUser: StaffUserRow | null;
    }
  >,
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
    case "feedback": {
      const rating = feedback.get(targetId);
      return {
        type: "feedback",
        feedback:
          rating === undefined
            ? null
            : {
                rating: rating.rating,
                author: staffUser(rating.fromUser),
                rated: staffUser(rating.toUser),
              },
      };
    }
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
  const others = alias(reports, "other_reports");
  const report = await db.query.reports.findFirst({
    where: {
      id,
      RAW: (t) => visibleTo(viewer.id, t) ?? EmptyFilter,
    },
    extras: {
      otherOpenReportCount: (t) =>
        sql<number>`(${db
          .select({ count: count() })
          .from(others)
          .where(
            and(
              eq(others.targetType, t.targetType),
              eq(others.targetId, t.targetId),
              inArray(others.status, [...openReportStatuses]),
              ne(others.id, t.id),
            ),
          )})`.mapWith(Number),
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
    otherOpenReportCount: report.otherOpenReportCount,
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
      const read = await readTradeView(targetId, { kind: "staff" });
      const trade =
        read &&
        (await db.query.tradeOffers.findFirst({
          where: { id: targetId, kind: "trade" },
          columns: {},
          with: { fromUser: party, toUser: party },
        }));

      if (!read || !trade) {
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
          current: read.disputeReport?.id === id,
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
        extras: {
          removed: (t) =>
            sql<boolean>`exists (select 1 from ${tradeMessages} where ${tradeMessages.id} = ${t.messageId} and ${tradeMessages.removedAt} is not null)`,
        },
      });
      if (!copy) {
        return { type: "message", message: null };
      }

      const sender =
        copy.senderId === null
          ? null
          : await fetchTargetUser(viewerRole, copy.senderId);
      const trade =
        (await readTradeView(copy.tradeId, { kind: "staff" }))?.trade ?? null;
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
          removed: copy.removed,
          trade,
        },
      };
    }
    case "feedback": {
      // removed or not, with its rater as staff act on them
      const row = await db.query.tradeFeedback.findFirst({
        where: { id: targetId },
        columns: {
          id: true,
          tradeId: true,
          rating: true,
          role: true,
          comment: true,
          communication: true,
          speed: true,
          createdAt: true,
          removedAt: true,
        },
        with: { fromUser: targetUserFields, toUser: staffUserFields },
      });
      if (!row) {
        return { type: "feedback", feedback: null };
      }

      return {
        type: "feedback",
        feedback: {
          id: row.id,
          tradeId: row.tradeId,
          rating: row.rating,
          role: row.role,
          comment: row.comment,
          communication: row.communication,
          speed: row.speed,
          createdAt: row.createdAt,
          removed: row.removedAt !== null,
          author:
            row.fromUser === null
              ? null
              : toTargetUser(viewerRole, row.fromUser),
          rated: staffUser(row.toUser),
        },
      };
    }
  }
}

/**
 * The relational fields toTargetUser reads, for a reported user, a reported
 * message's sender or a reported rating's author.
 */
const targetUserFields = {
  columns: {
    id: true,
    ...staffUserFields.columns,
    email: true,
    emailVerified: true,
    role: true,
    banned: true,
    banExpires: true,
  },
  extras: {
    liveTradeCount: (t: typeof user) =>
      db.$count(
        tradeOffers,
        and(
          eq(tradeOffers.kind, "trade"),
          inArray(tradeOffers.status, [...liveTradeStatuses]),
          or(eq(tradeOffers.fromUserId, t.id), eq(tradeOffers.toUserId, t.id)),
        ),
      ),
  },
  with: staffUserFields.with,
} as const;

/**
 * A reported user, or a reported message's sender, as staff act on them;
 * null once their account is deleted.
 */
async function fetchTargetUser(
  viewerRole: Role,
  userId: string,
): Promise<ReportTargetUser | null> {
  const row = await db.query.user.findFirst({
    where: { id: userId },
    ...targetUserFields,
  });
  return row ? toTargetUser(viewerRole, row) : null;
}

function toTargetUser(
  viewerRole: Role,
  row: StaffUserRow &
    Pick<
      typeof user.$inferSelect,
      "id" | "email" | "emailVerified" | "role" | "banned" | "banExpires"
    > & { liveTradeCount: number },
): ReportTargetUser {
  return {
    ...staffUser(row),
    id: row.id,
    role: row.role,
    ban: isBanActive(row) ? { until: row.banExpires } : null,
    liveTradeCount: row.liveTradeCount,
    protected: protectionFor(viewerRole, row, env.PROTECTED_EMAIL_DOMAINS),
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
