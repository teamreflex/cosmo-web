import StaffUserName from "@/components/admin/staff-user-name";
import StatusPill from "@/components/objekt/detail/status-pill";
import UserAvatar from "@/components/profile/user-avatar";
import { TradeStatus } from "@/components/trades/trade-header";
import TransferRows from "@/components/trades/transfer-rows";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "@/components/ui/timestamp";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useHydrated } from "@/hooks/use-hydrated";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { roleLabel } from "@/lib/client/roles";
import { partyRole, tradeTimeFormat } from "@/lib/client/trades";
import { env } from "@/lib/env/client";
import { $unbanUser } from "@/lib/functions/staff-users";
import { lazyWithPreload } from "@/lib/lazy";
import { adminReportsQueryFilter } from "@/lib/queries/reports";
import type {
  AdminReportDetail,
  ReportTargetMessage,
  ReportTargetTrade,
  ReportTargetUser,
  ReportTradeParty,
} from "@/lib/universal/reports";
import { staffUserText } from "@/lib/universal/staff-users";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense } from "react";
import { toast } from "sonner";
import FeedbackReport from "./feedback-report";
import { nameInput } from "./name-input";
import { OpenTradeLink, TargetHeader } from "./target-header";

type Props = {
  report: AdminReportDetail;
};

/**
 * What was reported: a user, the trade a dispute is about, a chat message,
 * or a rating.
 */
export default function ReportTarget({ report }: Props) {
  const { target } = report;
  switch (target.type) {
    case "user":
      return (
        <UserTarget
          user={target.user}
          otherOpenReportCount={report.otherOpenReportCount}
        />
      );
    case "trade":
      return <TradeTarget trade={target.trade} />;
    case "message":
      return <MessageTarget report={report} message={target.message} />;
    case "feedback":
      return <FeedbackReport report={report} feedback={target.feedback} />;
  }
}

// chat's client and Effect download only with a message report
const MessageReport = lazyWithPreload(() => import("./message-report"));

/**
 * The reported message: who sent it in which trade, its text from the
 * report's own copy, and the trade's chat, which chat lets staff read while
 * the report is open.
 */
function MessageTarget({
  report,
  message,
}: {
  report: AdminReportDetail;
  message: ReportTargetMessage | null;
}) {
  const hydrated = useHydrated();
  if (message === null) {
    return (
      <p className="px-4 py-3.5 text-sm text-muted-foreground">
        {m.admin_reports_message_gone()}
      </p>
    );
  }
  const sender = nameInput(message.sender, "detail");

  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <TargetHeader
        title={m.admin_reports_message_title()}
        byline={
          <ParaglideMessage
            message={m.admin_reports_message_sent_by}
            inputs={{ sender: sender.text, time: "" }}
            markup={{
              sender: sender.markup,
              time: () => (
                <Timestamp date={message.sentAt} format={tradeTimeFormat} />
              ),
            }}
          />
        }
        tradeId={message.trade?.id ?? null}
      />
      {env.VITE_CHAT_URL === undefined ? (
        <p className="text-sm text-muted-foreground">
          {m.admin_reports_message_unavailable()}
        </p>
      ) : hydrated ? (
        <Suspense fallback={<Skeleton className="h-24 rounded-md" />}>
          <MessageReport report={report} message={message} />
        </Suspense>
      ) : (
        // the server never renders it, since its client would dial chat
        <Skeleton className="h-24 rounded-md" />
      )}
    </div>
  );
}

/**
 * The reported user, with their role, ban state and other open reports.
 */
function UserTarget({
  user,
  otherOpenReportCount,
}: {
  user: ReportTargetUser | null;
  otherOpenReportCount: number;
}) {
  if (user === null) {
    return (
      <p className="px-4 py-3.5 text-sm text-muted-foreground">
        {m.admin_reports_deleted_user()}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <UserAvatar username={user.username} className="size-8 **:p-1" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <StaffUserName user={user} className="font-medium" />
          <StatusPill tone="muted" className="font-sans">
            {roleLabel(user.role)}
          </StatusPill>
        </div>
        <TargetMeta user={user} otherOpenReportCount={otherOpenReportCount} />
      </div>
      {user.ban !== null && user.protected === false && (
        <UnbanButton user={user} />
      )}
    </div>
  );
}

/**
 * The disputed trade: its parties, where it stands (frozen while disputed)
 * and every transfer, as the staff view of the trade page shows them.
 */
function TradeTarget({ trade }: { trade: ReportTargetTrade | null }) {
  if (trade === null) {
    return (
      <p className="px-4 py-3.5 text-sm text-muted-foreground">
        {m.admin_reports_trade_gone()}
      </p>
    );
  }

  const { view } = trade;
  return (
    <div className="flex flex-col gap-3 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-sm font-medium">
          {m.admin_reports_trade_title({ id: view.id.slice(0, 8) })}
        </span>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <TradeStatus trade={view} />
        </span>
        <OpenTradeLink tradeId={view.id} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <TradeParty
          party={trade.from}
          role={partyRole("from", view.listingId)}
        />
        <TradeParty party={trade.to} role={partyRole("to", view.listingId)} />
      </div>
      <TransferRows trade={view} side={null} />
    </div>
  );
}

/**
 * A party to the disputed trade: who they are, which side of the listing
 * or direct offer they're on, and whether they're banned.
 */
function TradeParty({
  party,
  role,
}: {
  party: ReportTradeParty | null;
  role: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-md border px-3 py-2.5">
      {party === null ? (
        <UserAvatar deleted className="size-8" />
      ) : (
        <UserAvatar username={party.username} className="size-8 **:p-1" />
      )}
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        {party === null ? (
          <span className="font-medium">{m.admin_reports_deleted_user()}</span>
        ) : (
          <StaffUserName user={party} className="font-medium" />
        )}
        <span className="text-xs text-muted-foreground">
          {role}
          {party?.banActive === true && (
            <>
              {" · "}
              <span className="text-destructive">
                {m.admin_reports_party_banned()}
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function TargetMeta({
  user,
  otherOpenReportCount,
}: {
  user: ReportTargetUser;
  otherOpenReportCount: number;
}) {
  if (user.ban === null && otherOpenReportCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-x-1.5 text-xs text-muted-foreground">
      {user.ban !== null && (
        <span className="text-destructive">
          {user.ban.until === null ? (
            m.admin_reports_banned_permanently()
          ) : (
            <>
              {m.admin_reports_banned_until()}{" "}
              <Timestamp
                date={user.ban.until}
                format={{ dateStyle: "medium" }}
              />
            </>
          )}
        </span>
      )}
      {user.ban !== null && otherOpenReportCount > 0 && (
        <span aria-hidden="true">·</span>
      )}
      {otherOpenReportCount > 0 && (
        <span>
          {m.admin_reports_other_open({ count: otherOpenReportCount })}
        </span>
      )}
    </div>
  );
}

/**
 * Lifts a ban; only roles that can ban see it.
 */
function UnbanButton({ user }: { user: ReportTargetUser }) {
  const hasPermission = useHasPermission();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => $unbanUser({ data: { userId: user.id } }),
    onSuccess: async () => {
      toast.success(
        m.admin_reports_unbanned({ username: staffUserText(user) }),
      );
      await queryClient.invalidateQueries(adminReportsQueryFilter);
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  if (!hasPermission({ user: ["ban"] })) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="ml-auto shrink-0"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <span>{m.admin_reports_unban()}</span>
      {mutation.isPending && <IconLoader2 className="animate-spin" />}
    </Button>
  );
}
