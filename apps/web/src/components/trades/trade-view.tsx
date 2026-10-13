import { m } from "@/i18n/messages";
import { reportReasonLabel } from "@/lib/client/reports";
import { itemName, partyName, tradeTimeFormat } from "@/lib/client/trades";
import { env } from "@/lib/env/client";
import { $recordTradeView } from "@/lib/functions/staff-trades";
import type {
  TradeParty,
  TradeView as Trade,
  TradeViewer,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { TradeSide } from "@apollo/database/web/types";
import {
  needsYou,
  partyAction,
  type PartyActionRefusal,
} from "@apollo/trades/lifecycle";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCopy,
  IconEye,
  IconFlag,
  IconHourglassEmpty,
  IconX,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { bold } from "../notifications/row-utils";
import UserAvatar from "../profile/user-avatar";
import ListingBottomBar from "../trade-listings/listing-bottom-bar";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button, buttonVariants } from "../ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "../ui/item";
import { Skeleton } from "../ui/skeleton";
import { Timestamp } from "../ui/timestamp";
import CancelTradeDialog from "./cancel-trade-dialog";
import OpenDisputeDialog from "./open-dispute-dialog";
import TradeHeader, { TradeHeaderSkeleton } from "./trade-header";
import TradeTimeline from "./trade-timeline";
import TransferRows from "./transfer-rows";

type Props = {
  trade: Trade;
  viewer: TradeViewer;
};

/**
 * The trade page: the header, the steps, where the trade stands, every
 * transfer, and beside them who it's with and the timeline. Its parties
 * can act on it; staff read it.
 */
export default function TradeView({ trade, viewer }: Props) {
  return viewer.kind === "party" ? (
    <PartyView trade={trade} side={viewer.side} />
  ) : (
    <StaffView trade={trade} report={viewer.report} />
  );
}

/**
 * The page as one of its parties sees it. While they still owe objekts it
 * says what to send to whom, with their partner's COSMO ID to copy, and it
 * offers cancel and dispute wherever the server would allow them, in the
 * phone bar below tablet width.
 */
function PartyView({ trade, side }: { trade: Trade; side: TradeSide }) {
  const startedId = useId();
  const [dialog, setDialog] = useState<"cancel" | "dispute" | null>(null);
  const counterparty = trade.parties[side === "from" ? "to" : "from"];
  const owing = needsYou(trade.state, side);
  const copyName = owing ? counterparty.cosmoUsername : null;
  /**
   * The same judgement the server makes, so a refused action refetches
   * into a page that no longer offers it.
   */
  const facts = {
    deadlinePassed: trade.deadlinePassed,
    arrived: trade.items.some((item) => item.status === "arrived"),
  };
  const cancel = partyAction(trade.state, { type: "cancel", by: side }, facts);
  const offered = {
    cancel: cancel.ok,
    dispute: partyAction(trade.state, { type: "dispute", by: side }, facts).ok,
  };
  const describedBy =
    !cancel.ok && cancel.reason === "already_started" ? startedId : undefined;
  const bar = copyName !== null || offered.cancel || offered.dispute;
  // Copy takes its own row in the phone bar when Cancel and Dispute join it
  const barRows = copyName !== null && offered.cancel ? 2 : 1;

  return (
    <>
      <TradeLayout
        trade={trade}
        side={side}
        strip={
          <ActionStrip
            trade={trade}
            side={side}
            owing={owing}
            refusal={cancel.ok ? null : cancel.reason}
            startedId={startedId}
          >
            {bar && (
              <div className="flex flex-wrap gap-2 max-md:hidden">
                {copyName !== null && <CopyCosmoId username={copyName} />}
                <PartyActions
                  offered={offered}
                  describedBy={describedBy}
                  onOpen={setDialog}
                />
              </div>
            )}
          </ActionStrip>
        }
        bar={
          bar
            ? {
                rows: barRows,
                children: (
                  <div className="flex flex-1 flex-wrap gap-2">
                    {copyName !== null && (
                      <CopyCosmoId
                        username={copyName}
                        className={cn(
                          "h-11 flex-1",
                          barRows === 2 && "basis-full",
                        )}
                      />
                    )}
                    <PartyActions
                      offered={offered}
                      describedBy={describedBy}
                      onOpen={setDialog}
                      className="h-11 flex-1"
                    />
                  </div>
                ),
              }
            : undefined
        }
      />
      <CancelTradeDialog
        tradeId={trade.id}
        listingId={trade.listingId}
        side={side}
        name={partyName(counterparty)}
        open={dialog === "cancel" && offered.cancel}
        onOpenChange={(open) => setDialog(open ? "cancel" : null)}
      />
      <OpenDisputeDialog
        tradeId={trade.id}
        listingId={trade.listingId}
        deadline={trade.deadlineAt}
        hasPayment={trade.items.some((item) => item.kind === "payment")}
        open={dialog === "dispute" && offered.dispute}
        onOpenChange={(open) => setDialog(open ? "dispute" : null)}
      />
    </>
  );
}

/**
 * The page as staff read it: both parties named, in the third person,
 * with no actions. Opening it records one audit row, from here rather
 * than the loader, which can run several times per visit.
 */
function StaffView({
  trade,
  report,
}: {
  trade: Trade;
  report: Extract<TradeViewer, { kind: "staff" }>["report"];
}) {
  const { mutate: recordView } = useMutation({ mutationFn: $recordTradeView });
  useEffect(() => {
    recordView({ data: { tradeId: trade.id } });
  }, [recordView, trade.id]);

  return (
    <TradeLayout
      trade={trade}
      side={null}
      banner={
        <Alert variant="destructive" role="status">
          <IconEye />
          <AlertTitle>{m.trade_page_staff_title()}</AlertTitle>
          <AlertDescription>
            {m.trade_page_staff_description()}
          </AlertDescription>
          {report !== null && (
            <Link
              to="/admin/reports"
              search={{ status: report.status, report: report.id }}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-2 w-fit no-underline! group-has-[>svg]/alert:col-start-2",
              )}
            >
              {m.trade_page_staff_back()}
            </Link>
          )}
        </Alert>
      }
    />
  );
}

/**
 * The page around the viewer's own parts: staff's banner above the steps,
 * the party's strip under the transfers, and the phone bar with the room
 * it takes at the bottom of the page.
 */
function TradeLayout({
  trade,
  side,
  banner,
  strip,
  bar,
}: {
  trade: Trade;
  /** the viewer's side, or null for staff */
  side: TradeSide | null;
  banner?: ReactNode;
  strip?: ReactNode;
  bar?: { rows: 1 | 2; children: ReactNode };
}) {
  return (
    <>
      <TradeHeader trade={trade} side={side} />
      <div
        className={cn(
          "container flex flex-col gap-5 pt-5 lg:pt-6",
          bar === undefined
            ? "pb-10"
            : bar.rows === 1
              ? "pb-28 md:pb-10"
              : "pb-40 md:pb-10",
        )}
      >
        {banner}
        <TradeSteps trade={trade} side={side} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <StatePanel trade={trade} side={side} />
            <TransferRows
              items={trade.items}
              parties={trade.parties}
              side={side}
            >
              {strip}
            </TransferRows>
            {trade.state.status === "accepted" && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {m.trade_page_deadline_note({ appName: env.VITE_APP_NAME })}
              </p>
            )}
          </div>
          <aside className="flex min-w-0 flex-col gap-4">
            {(
              (side === null
                ? ["from", "to"]
                : [side === "from" ? "to" : "from"]) satisfies TradeSide[]
            ).map((party) => (
              <PartyCard
                key={party}
                party={trade.parties[party]}
                side={party}
              />
            ))}
            <TradeTimeline trade={trade} side={side} />
          </aside>
        </div>
      </div>
      {bar !== undefined && <ListingBottomBar>{bar.children}</ListingBottomBar>}
    </>
  );
}

/**
 * The strip under the transfers: what the viewer still has to send, why
 * Cancel is gone once anything was sent, or that the deadline has passed,
 * beside the viewer's actions from tablet width.
 */
function ActionStrip({
  trade,
  side,
  owing,
  refusal,
  startedId,
  children,
}: {
  trade: Trade;
  side: TradeSide;
  owing: boolean;
  /** why the viewer can't cancel, if they can't */
  refusal: PartyActionRefusal | null;
  startedId: string;
  /** the actions, or nothing when none apply */
  children: ReactNode;
}) {
  const name = partyName(trade.parties[side === "from" ? "to" : "from"]);
  /**
   * Only waiting objekts are left to send: an arrived one waits for the
   * drain, and one that moved or can't move has its own alert.
   */
  const mine = trade.items.filter((item) => item.sender === side);
  const waiting = mine.filter((item) => item.status === "waiting").length;
  const started =
    refusal === "already_started"
      ? (trade.items.find((item) => item.status === "sent") ??
        trade.items.find((item) => item.status === "arrived"))
      : undefined;
  if (!owing && !children && refusal !== "deadline_passed") return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-4 py-3">
      <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-1 text-sm text-muted-foreground">
        {owing && (
          <p>
            {waiting > 0
              ? m.trade_page_send({ count: waiting, name })
              : mine.some((item) => item.status === "arrived") &&
                m.trade_page_send_arrived({ appName: env.VITE_APP_NAME })}
          </p>
        )}
        {started !== undefined && (
          <p id={startedId}>
            {started.sender === side ? (
              <ParaglideMessage
                message={m.trade_page_cancel_started_you}
                inputs={{ objekt: itemName(started) }}
                markup={bold}
              />
            ) : (
              <ParaglideMessage
                message={m.trade_page_cancel_started_them}
                inputs={{ objekt: itemName(started), name }}
                markup={bold}
              />
            )}
          </p>
        )}
        {refusal === "deadline_passed" && (
          <p>{m.trade_page_deadline_passed({ appName: env.VITE_APP_NAME })}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Cancel and Open dispute, each only where the server would allow it.
 */
function PartyActions({
  offered,
  describedBy,
  onOpen,
  className,
}: {
  offered: { cancel: boolean; dispute: boolean };
  /** the line saying why Cancel is gone, when it is */
  describedBy: string | undefined;
  onOpen: (dialog: "cancel" | "dispute") => void;
  className?: string;
}) {
  return (
    <>
      {offered.cancel && (
        <Button
          variant="outline"
          className={className}
          onClick={() => onOpen("cancel")}
        >
          <IconX />
          {m.trade_page_cancel()}
        </Button>
      )}
      {offered.dispute && (
        <Button
          variant="destructive"
          className={className}
          aria-describedby={describedBy}
          onClick={() => onOpen("dispute")}
        >
          <IconFlag />
          {m.trade_page_dispute_open()}
        </Button>
      )}
    </>
  );
}

const stepTones = {
  done: {
    box: "border-teal-500/30 bg-teal-500/8",
    eyebrow: "text-teal-700 dark:text-teal-500",
  },
  current: {
    box: "border-amber-500/45 bg-amber-500/10",
    eyebrow: "text-amber-700 dark:text-amber-400",
  },
  dispute: {
    box: "border-destructive/45 bg-destructive/10",
    eyebrow: "text-destructive",
  },
  todo: {
    box: "border-border bg-card text-muted-foreground",
    eyebrow: "text-muted-foreground",
  },
};

/**
 * Accepted, both send, complete, with a segment per transfer in the middle
 * step. Phones show only the step the trade is on. An ended trade that
 * didn't complete has no steps left to show.
 */
function TradeSteps({ trade, side }: { trade: Trade; side: TradeSide | null }) {
  const { status } = trade.state;
  if (status === "cancelled" || status === "timed_out") return null;

  const completed = status === "completed";
  const seen = trade.items.filter((item) => item.status === "sent").length;
  const poster = partyName(trade.parties.from);
  const claimer = partyName(trade.parties.to);
  const steps = [
    {
      tone: "done",
      eyebrow: m.trade_page_step_done({ step: 0 }),
      // the claimer is always the side that accepts a listing
      title:
        side === "to"
          ? m.trade_page_step_accepted_you({ name: poster })
          : side === "from"
            ? m.trade_page_step_accepted_them({ name: claimer })
            : m.trade_page_step_accepted_staff({ claimer, poster }),
    },
    {
      tone: completed ? "done" : status === "disputed" ? "dispute" : "current",
      eyebrow: completed
        ? m.trade_page_step_done({ step: 1 })
        : status === "disputed"
          ? m.trade_page_step_dispute({ step: 1 })
          : m.trade_page_step({ step: 1 }),
      title: m.trade_page_step_send({ seen, count: trade.items.length }),
    },
    {
      tone: completed ? "done" : "todo",
      eyebrow: completed
        ? m.trade_page_step_done({ step: 2 })
        : m.trade_page_step({ step: 2 }),
      title: m.trade_page_step_complete(),
    },
  ] as const;
  const current = completed ? 2 : 1;

  return (
    <ol
      aria-label={m.trade_page_steps()}
      className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3"
    >
      {steps.map((step, index) => (
        <li
          key={step.eyebrow}
          aria-current={index === current ? "step" : undefined}
          className={cn(
            "flex min-w-0 flex-col gap-1 rounded-md border px-3 py-2.5",
            stepTones[step.tone].box,
            index !== current && "max-sm:hidden",
          )}
        >
          <span
            className={cn(
              "text-xxs font-medium tracking-widest uppercase",
              stepTones[step.tone].eyebrow,
            )}
          >
            {step.eyebrow}
          </span>
          <span className="text-sm font-semibold tabular-nums">
            {step.title}
          </span>
          {index === 1 && (
            <span aria-hidden className="flex gap-0.75 pt-0.5">
              {trade.items.map((item) => (
                <span
                  key={item.id}
                  className={cn(
                    "h-1.5 min-w-0 flex-1 rounded-full",
                    item.status === "sent" ? "bg-teal-500" : "bg-muted",
                  )}
                />
              ))}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

const warningAlert =
  "border-amber-500/40 *:[svg]:text-amber-700 dark:*:[svg]:text-amber-500";

/**
 * Where the trade stands when it isn't simply running: how it ended, the
 * dispute that froze it, or an objekt that can no longer reach its
 * receiver. Staff read it in the third person.
 */
function StatePanel({ trade, side }: { trade: Trade; side: TradeSide | null }) {
  const appName = env.VITE_APP_NAME;
  const { state } = trade;

  switch (state.status) {
    case "accepted":
      return trade.items.map((item) => {
        if (item.status !== "moved" && item.status !== "untransferable") {
          return null;
        }
        const objekt = itemName(item);
        const yours = item.sender === side;
        const receiver = item.sender === "from" ? "to" : "from";
        return (
          <Alert key={item.id} className={warningAlert}>
            <IconAlertTriangle />
            <AlertTitle>
              <ParaglideMessage
                message={
                  item.status === "moved"
                    ? yours
                      ? m.trade_page_moved_yours_title
                      : m.trade_page_moved_theirs_title
                    : yours
                      ? m.trade_page_untransferable_yours_title
                      : m.trade_page_untransferable_theirs_title
                }
                inputs={{ objekt }}
                markup={bold}
              />
            </AlertTitle>
            <AlertDescription>
              {yours
                ? item.status === "moved"
                  ? m.trade_page_moved_yours_body({
                      name: partyName(trade.parties[receiver]),
                    })
                  : m.trade_page_untransferable_yours_body({
                      name: partyName(trade.parties[receiver]),
                    })
                : side === null
                  ? m.trade_page_problem_staff_body({
                      name: partyName(trade.parties[receiver]),
                    })
                  : m.trade_page_problem_theirs_body()}
            </AlertDescription>
          </Alert>
        );
      });
    case "disputed":
      return <DisputedAlert trade={trade} side={side} />;
    case "completed": {
      const staff = trade.events.findLast(
        ({ event }) => event.type === "completed" && event.by === "staff",
      );
      const last = trade.items.reduce<Date | null>(
        (latest, { transferredAt }) =>
          transferredAt !== null && (latest === null || transferredAt > latest)
            ? transferredAt
            : latest,
        null,
      );
      return (
        <Alert className="*:[svg]:text-emerald-700 dark:*:[svg]:text-emerald-400">
          <IconCircleCheck />
          <AlertTitle>
            {staff === undefined
              ? m.trade_page_completed_title({ count: trade.items.length })
              : m.trade_page_completed_staff({ appName })}
          </AlertTitle>
          {staff === undefined && last !== null && (
            <AlertDescription>
              <ParaglideMessage
                message={m.trade_page_completed_last}
                inputs={{ when: "" }}
                markup={{
                  time: () => (
                    <Timestamp date={last} format={tradeTimeFormat} />
                  ),
                }}
              />
            </AlertDescription>
          )}
          {staff !== undefined && <StaffNote event={staff.event} />}
        </Alert>
      );
    }
    case "cancelled": {
      const { cancelledBy } = state;
      const cancel = trade.events.findLast(
        ({ event }) => event.type === "cancelled",
      );
      return (
        <Alert variant={cancelledBy === "staff" ? "destructive" : "default"}>
          <IconX />
          <AlertTitle>
            {cancelledBy === "staff"
              ? m.trade_page_cancelled_staff({ appName })
              : cancelledBy === side
                ? m.trade_page_cancelled_you()
                : m.trade_page_cancelled_them({
                    name: partyName(trade.parties[cancelledBy]),
                  })}
          </AlertTitle>
          {cancel !== undefined && <StaffNote event={cancel.event} />}
          {trade.items.some((item) => item.status === "sent") && (
            <AlertDescription>
              {m.trade_page_not_reversed({ appName })}
            </AlertDescription>
          )}
        </Alert>
      );
    }
    case "timed_out":
      return (
        <TimedOutAlert
          trade={trade}
          side={side}
          abandoned={state.abandonedBy}
        />
      );
    default:
      return null;
  }
}

/**
 * The dispute that froze the trade: who opened it and why, what happens
 * next, and when. Its note is only for moderators.
 */
function DisputedAlert({
  trade,
  side,
}: {
  trade: Trade;
  side: TradeSide | null;
}) {
  const appName = env.VITE_APP_NAME;
  const dispute = trade.events.findLast(
    ({ event }) => event.type === "disputed",
  );
  if (dispute === undefined || dispute.event.type !== "disputed") {
    return null;
  }
  const { event } = dispute;
  return (
    <Alert variant="destructive">
      <IconFlag />
      <AlertTitle>
        {event.by === "staff"
          ? m.trade_page_disputed_staff({ appName })
          : event.by === side
            ? m.trade_page_disputed_you({
                reason: reportReasonLabel(event.reason),
              })
            : m.trade_page_disputed_them({
                name: partyName(trade.parties[event.by]),
                reason: reportReasonLabel(event.reason),
              })}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-1 [&_p:not(:last-child)]:mb-0">
        <p>
          {side === null
            ? m.trade_page_disputed_body_staff()
            : m.trade_page_disputed_body()}
        </p>
        <p className="text-xs">
          <ParaglideMessage
            message={m.trade_page_disputed_meta}
            inputs={{ when: "", report: event.reportId.slice(0, 8) }}
            markup={{
              time: () => (
                <Timestamp date={dispute.createdAt} format={tradeTimeFormat} />
              ),
            }}
          />
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * How many objekts each side still owed when time ran out, which earns the
 * abandoned mark, and the way back to the listing.
 */
function TimedOutAlert({
  trade,
  side,
  abandoned,
}: {
  trade: Trade;
  side: TradeSide | null;
  abandoned: TradeSide[];
}) {
  const appName = env.VITE_APP_NAME;
  const owed = (sender: TradeSide) =>
    trade.items.filter(
      (item) => item.sender === sender && item.status !== "sent",
    ).length;
  return (
    <Alert className={warningAlert}>
      <IconHourglassEmpty />
      <AlertTitle>
        {abandoned.length > 1
          ? side === null
            ? m.trade_page_timed_out_both_staff()
            : m.trade_page_timed_out_both()
          : side !== null && abandoned.includes(side)
            ? m.trade_page_timed_out_you()
            : m.trade_page_timed_out_them({
                name: partyName(
                  trade.parties[abandoned.includes("from") ? "from" : "to"],
                ),
              })}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-1 [&_p:not(:last-child)]:mb-0">
        <p>
          {abandoned
            .map((sender) =>
              sender === side
                ? m.trade_page_owed_you({ count: owed(sender) })
                : m.trade_page_owed_them({
                    count: owed(sender),
                    name: partyName(trade.parties[sender]),
                  }),
            )
            .join(" ")}{" "}
          {m.trade_page_abandoned_note()}
        </p>
        {trade.items.some((item) => item.status === "sent") && (
          <p>{m.trade_page_not_reversed({ appName })}</p>
        )}
      </AlertDescription>
      {trade.listingId !== null && (
        <Link
          to="/market/listing/$id"
          params={{ id: trade.listingId }}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "mt-2 w-fit no-underline! group-has-[>svg]/alert:col-start-2",
          )}
        >
          {m.trade_page_view_listing()}
        </Link>
      )}
    </Alert>
  );
}

/**
 * The reason staff gave when they ended the trade, if they gave one.
 */
function StaffNote({ event }: { event: Trade["events"][number]["event"] }) {
  return (
    "note" in event &&
    event.note !== null && (
      <AlertDescription dir="auto" className="break-words">
        {m.trade_page_reason_given({ note: event.note })}
      </AlertDescription>
    )
  );
}

/**
 * A party to the trade: their avatar and name, linking to their profile
 * when they have a COSMO username, and whether they posted or accepted
 * the listing.
 */
function PartyCard({ party, side }: { party: TradeParty; side: TradeSide }) {
  const name = partyName(party);

  return (
    <Item variant="outline" className="bg-card">
      <ItemMedia>
        {party.user === null ? (
          <UserAvatar deleted className="size-9" />
        ) : (
          <UserAvatar
            username={party.cosmoUsername ?? party.user.username}
            className="size-9 text-sm **:p-1.5"
          />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {party.cosmoUsername === null ? (
            name
          ) : (
            <Link
              to="/@{$username}"
              params={{ username: party.cosmoUsername }}
              className="underline-offset-4 hover:underline"
            >
              {name}
            </Link>
          )}
        </ItemTitle>
        <ItemDescription>
          {side === "from"
            ? m.trade_page_role_poster()
            : m.trade_page_role_claimer()}
        </ItemDescription>
      </ItemContent>
    </Item>
  );
}

/**
 * Copies the other party's COSMO ID, which is who the viewer sends to in
 * the COSMO app. It only says so once the copy worked.
 */
function CopyCosmoId({
  username,
  className,
}: {
  username: string;
  className?: string;
}) {
  const [, copy] = useCopyToClipboard();

  return (
    <Button
      variant="outline"
      className={className}
      onClick={async () => {
        if (await copy(username)) {
          toast.success(m.toast_copied_clipboard());
        } else {
          toast.error(m.trade_page_copy_failed({ username }));
        }
      }}
    >
      <IconCopy />
      {m.trade_page_copy()}
    </Button>
  );
}

export function TradeViewSkeleton() {
  return (
    <>
      <TradeHeaderSkeleton />
      <div className="container flex flex-col gap-5 pt-5 pb-10 lg:pt-6">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3">
          <Skeleton className="h-16 rounded-md max-sm:hidden" />
          <Skeleton className="h-16 rounded-md" />
          <Skeleton className="h-16 rounded-md max-sm:hidden" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    </>
  );
}
