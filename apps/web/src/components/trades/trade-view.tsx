import { useHydrated } from "@/hooks/use-hydrated";
import { m } from "@/i18n/messages";
import { reportReasonLabel } from "@/lib/client/reports";
import {
  itemName,
  partyName,
  partyRole,
  tradeTimeFormat,
} from "@/lib/client/trades";
import { env } from "@/lib/env/client";
import type {
  TradeParty,
  TradeView as Trade,
  TradeViewer,
} from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { TradeSide, TradeStatus } from "@apollo/database/web/types";
import {
  needsYou,
  otherSide,
  partyAction,
  type PartyActionRefusal,
  transition,
} from "@apollo/trades/lifecycle";
import { CLAIM_WINDOW } from "@apollo/trades/timers";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCopy,
  IconEye,
  IconFlag,
  IconHourglassEmpty,
  IconPlayerPause,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { lazy, type ReactNode, Suspense, useId, useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import FeedbackBadge from "../feedback/feedback-badge";
import type { FeedbackWindow } from "../feedback/feedback-leave-dialog";
import FeedbackPrompt, { FeedbackBar } from "../feedback/feedback-prompt";
import TradeFeedback from "../feedback/trade-feedback";
import { useFeedbackLeave } from "../feedback/use-feedback-leave";
import { bold } from "../notifications/row-utils";
import ListingBottomBar from "../trade-listings/listing-bottom-bar";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Button, buttonVariants } from "../ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "../ui/item";
import { Skeleton } from "../ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { Timestamp } from "../ui/timestamp";
import CancelTradeDialog from "./cancel-trade-dialog";
import CounterOfferSheet from "./counter-offer-sheet";
import OfferActionDialog from "./offer-action-dialog";
import {
  CounterLink,
  type OfferButton,
  OfferActions,
  OfferEndedAlert,
  OfferStrip,
  type OfferTrade,
} from "./offer-view";
import OpenDisputeDialog from "./open-dispute-dialog";
import TradeHeader, { PartyAvatar, PartyLink } from "./trade-header";
import TradeTimeline from "./trade-timeline";
import TransferRows from "./transfer-rows";

type Props = {
  trade: Trade;
  viewer: TradeViewer;
};

/**
 * The trade page: the header, the steps, where the trade stands, every
 * transfer, and beside them who it's with and the chat, or for staff the
 * timeline too. Its parties can act on it; staff read it. Until a direct
 * offer is accepted its parties answer the offer instead.
 */
export default function TradeView({ trade, viewer }: Props) {
  if (viewer.kind === "staff") {
    return <StaffView trade={trade} report={viewer.report} />;
  }
  return trade.stage === "offer" ? (
    <OfferView trade={trade} side={viewer.side} />
  ) : (
    <PartyView trade={trade} side={viewer.side} />
  );
}

/**
 * The page as one of its parties sees it. While they still owe objekts
 * before the deadline it says what to send to whom, with their partner's
 * COSMO ID to copy, and it offers cancel and dispute wherever the server
 * would allow them, in the phone bar below tablet width. Once the trade
 * ended, the phone bar holds Leave feedback while the viewer may rate.
 */
function PartyView({
  trade,
  side,
}: {
  trade: Extract<Trade, { stage: "trade" }>;
  side: TradeSide;
}) {
  const startedId = useId();
  const [dialog, setDialog] = useState<"cancel" | "dispute" | null>(null);
  const feedbackLeave = useFeedbackLeave(trade, side);
  const { feedback } = trade;
  const counterparty = trade.parties[otherSide(side)];
  /**
   * The same judgement the server makes, so a refused action refetches
   * into a page that no longer offers it.
   */
  const facts = {
    deadlinePassed: trade.deadlinePassed,
    arrived: trade.items.some((item) => item.status === "arrived"),
  };
  const owing = needsYou(trade.state, side, facts);
  /**
   * Only waiting objekts are left to send: an arrived one waits for the
   * drain, and one that moved or can't move can't be sent. Copy only helps
   * while one is.
   */
  const waiting = trade.items.filter(
    (item) => item.sender === side && item.status === "waiting",
  ).length;
  const copyName = owing && waiting > 0 ? counterparty.cosmoUsername : null;
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
        onLeave={feedbackLeave.leave}
        strip={
          <ActionStrip
            trade={trade}
            side={side}
            counterparty={counterparty}
            owing={owing}
            waiting={waiting}
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
            : feedback.state === "open"
              ? {
                  rows: 1,
                  children: (
                    <FeedbackBar
                      trade={trade}
                      side={side}
                      onLeave={() => feedbackLeave.leave(feedback)}
                      actions={
                        trade.state.status === "timed_out" &&
                        trade.listingId !== null ? (
                          <ViewListingLink
                            listingId={trade.listingId}
                            className="h-11 px-4"
                          />
                        ) : undefined
                      }
                    />
                  ),
                }
              : undefined
        }
      />
      {feedbackLeave.dialog}
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
 * A direct offer as one of its parties sees it before it's accepted. Its
 * recipient can decline, counter or accept it and its sender can withdraw
 * it, each only where the server would allow it, in the phone bar below
 * tablet width. Once it ended there, a countered offer's phone bar leads to
 * the counter.
 */
function OfferView({ trade, side }: { trade: OfferTrade; side: TradeSide }) {
  const [dialog, setDialog] = useState<OfferButton | null>(null);
  const actions = (
    ["decline", "counter", "accept", "withdraw"] satisfies OfferButton[]
  ).filter((type) => transition(trade.state, { type, by: side }).ok);

  return (
    <>
      <TradeLayout
        trade={trade}
        side={side}
        strip={
          trade.state.status === "pending" && (
            <OfferStrip trade={trade} side={side}>
              {actions.length > 0 && (
                <div className="flex flex-wrap gap-2 max-md:hidden">
                  <OfferActions actions={actions} onOpen={setDialog} />
                </div>
              )}
            </OfferStrip>
          )
        }
        bar={
          actions.length > 0
            ? {
                rows: 1,
                children: (
                  <div className="flex flex-1 gap-2">
                    <OfferActions
                      actions={actions}
                      onOpen={setDialog}
                      className="h-11 flex-1"
                    />
                  </div>
                ),
              }
            : trade.counter === null
              ? undefined
              : {
                  rows: 1,
                  children: (
                    <CounterLink
                      counterId={trade.counter.id}
                      className="h-11 flex-1"
                    />
                  ),
                }
        }
      />
      {actions.includes("counter") && (
        <CounterOfferSheet
          trade={trade}
          open={dialog === "counter"}
          onOpenChange={(open) => setDialog(open ? "counter" : null)}
        />
      )}
      {actions
        .filter((action) => action !== "counter")
        .map((action) => (
          <OfferActionDialog
            key={action}
            tradeId={trade.id}
            items={trade.items}
            action={action}
            name={partyName(trade.parties[otherSide(side)])}
            open={dialog === action}
            onOpenChange={(open) => setDialog(open ? action : null)}
          />
        ))}
    </>
  );
}

/**
 * The page as staff read it: both parties named, in the third person,
 * with no actions. A pending offer says what was offered and until when.
 */
function StaffView({
  trade,
  report,
}: {
  trade: Trade;
  report: Extract<TradeViewer, { kind: "staff" }>["report"];
}) {
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
      strip={
        trade.stage === "offer" &&
        trade.state.status === "pending" && (
          <OfferStrip trade={trade} side={null} />
        )
      }
    />
  );
}

// Effect and the RPC client download only with the panel
const ChatPanel = lazy(() => import("./chat/chat-panel"));

const chatHeight = "h-[min(40rem,calc(100dvh-12rem))] min-h-96";

// below laptop width the page splits into transfers and the chat
const tradeTabs = ["transfers", "chat"] as const;
type TradeTab = (typeof tradeTabs)[number];

/**
 * The page around the viewer's own parts: staff's banner above the steps,
 * the party's strip under the transfers, and the phone bar with the room
 * it takes at the bottom of the page. Once an offer is accepted, the chat
 * sits beside the transfers, or in its own tab below laptop width; before
 * that, the parties read the timeline there.
 */
function TradeLayout({
  trade,
  side,
  onLeave,
  banner,
  strip,
  bar,
}: {
  trade: Trade;
  /** the viewer's side, or null for staff */
  side: TradeSide | null;
  /** opens the party's leave-feedback dialog */
  onLeave?: (feedbackWindow: FeedbackWindow) => void;
  banner?: ReactNode;
  strip?: ReactNode;
  bar?: { rows: 1 | 2; children: ReactNode };
}) {
  const [tab, setTab] = useState<TradeTab>("transfers");
  // the other party's messages that arrived while the chat tab was closed
  const [unread, setUnread] = useState(0);
  // chat runs where the web app knows its URL, and opens once an offer is accepted
  const chat = env.VITE_CHAT_URL !== undefined && trade.stage === "trade";
  const chatTab = chat && tab === "chat";
  const hydrated = useHydrated();
  const chatSkeleton = (
    <Skeleton className={cn(chatHeight, !chatTab && "max-lg:hidden")} />
  );

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
        {chat && (
          <Tabs
            className="lg:hidden"
            value={tab}
            onValueChange={(value) => {
              const picked = tradeTabs.find((option) => option === value);
              if (picked !== undefined) {
                setTab(picked);
                if (picked === "chat") setUnread(0);
              }
            }}
          >
            <TabsList
              aria-label={m.trade_page_tabs_label()}
              className="w-full max-md:h-10"
            >
              <TabsTrigger value="transfers" className="flex-1">
                {m.trade_page_tab_transfers()}
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1">
                {m.trade_page_tab_chat()}
                {unread > 0 && (
                  <Badge className="h-4.5 min-w-4.5 px-1 font-mono tabular-nums">
                    {unread}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
          <div
            className={cn(
              "flex min-w-0 flex-col gap-4",
              chatTab && "max-lg:hidden",
            )}
          >
            <StatePanel trade={trade} side={side} onLeave={onLeave} />
            <TransferRows trade={trade} side={side}>
              {strip}
            </TransferRows>
            {trade.state.status === "accepted" && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {m.trade_page_deadline_note({ appName: env.VITE_APP_NAME })}
              </p>
            )}
          </div>
          <aside className="flex min-w-0 flex-col gap-4">
            <div
              className={cn(
                "flex min-w-0 flex-col gap-4",
                chatTab && "max-lg:hidden",
              )}
            >
              {(
                (side === null
                  ? ["from", "to"]
                  : [otherSide(side)]) satisfies TradeSide[]
              ).map((party) => (
                <PartyCard
                  key={party}
                  party={trade.parties[party]}
                  role={partyRole(party, trade.listingId)}
                />
              ))}
              {side !== null && <TradeFeedback trade={trade} side={side} />}
              {/* the parties read every event in the chat */}
              {(side === null || !chat) && (
                <TradeTimeline trade={trade} side={side} />
              )}
            </div>
            {chat &&
              // the server never renders the panel, whose client would dial chat
              (hydrated ? (
                <Suspense fallback={chatSkeleton}>
                  <ChatPanel
                    trade={trade}
                    side={side}
                    className={cn(chatHeight, !chatTab && "max-lg:hidden")}
                    onIncoming={() => {
                      if (!chatTab) setUnread((total) => total + 1);
                    }}
                  />
                </Suspense>
              ) : (
                chatSkeleton
              ))}
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
  counterparty,
  owing,
  waiting,
  refusal,
  startedId,
  children,
}: {
  trade: Trade;
  side: TradeSide;
  counterparty: TradeParty;
  owing: boolean;
  /** how many of the viewer's objekts are still to send */
  waiting: number;
  /** why the viewer can't cancel, if they can't */
  refusal: PartyActionRefusal | null;
  startedId: string;
  /** the actions, or nothing when none apply */
  children: ReactNode;
}) {
  const name = partyName(counterparty);
  const started =
    refusal === "already_started"
      ? (trade.items.find((item) => item.status === "sent") ??
        trade.items.find((item) => item.status === "arrived"))
      : undefined;
  const startedCount =
    started === undefined
      ? 0
      : trade.items.filter(
          (item) =>
            item.sender === started.sender &&
            (item.status === "sent" || item.status === "arrived"),
        ).length;
  if (!owing && !children && refusal !== "deadline_passed") return null;

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-4 py-3">
      <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-1 text-sm wrap-anywhere text-muted-foreground">
        {owing &&
          (waiting > 0 ? (
            <p>
              {counterparty.cosmoUsername === null
                ? m.trade_page_send_no_cosmo({
                    count: waiting,
                    name,
                    appName: env.VITE_APP_NAME,
                  })
                : m.trade_page_send({ count: waiting, name })}
            </p>
          ) : (
            trade.items.some(
              (item) => item.sender === side && item.status === "arrived",
            ) && (
              <p>{m.trade_page_send_arrived({ appName: env.VITE_APP_NAME })}</p>
            )
          ))}
        {started !== undefined && (
          <p id={startedId}>
            {started.sender === side ? (
              startedCount > 1 ? (
                m.trade_page_cancel_started_you_many({ count: startedCount })
              ) : (
                <ParaglideMessage
                  message={m.trade_page_cancel_started_you}
                  inputs={{ objekt: itemName(started) }}
                  markup={bold}
                />
              )
            ) : startedCount > 1 ? (
              m.trade_page_cancel_started_them_many({
                count: startedCount,
                name,
              })
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
    eyebrow: "text-red-700 dark:text-destructive",
  },
  paused: {
    box: "border-border bg-muted/50",
    eyebrow: "text-muted-foreground",
  },
  todo: {
    box: "border-border bg-card text-muted-foreground",
    eyebrow: "text-muted-foreground",
  },
};

// the statuses a trade shows its steps in; the rest ended without completing
const steppedStatuses: TradeStatus[] = [
  "pending",
  "accepted",
  "disputed",
  "completed",
];

/**
 * Accept, both send, complete, with a segment per transfer in the middle
 * step, or one bar once segments would be too thin to read. A pending offer
 * is on the first step, which its recipient takes by accepting it. Phones
 * show only the step the trade is on, with how long a pending offer's
 * second step will take. A trade or offer that ended without completing has
 * no steps left to show. A dispute staff opened by banning a party reads as
 * a neutral pause, as its alert does.
 */
function TradeSteps({ trade, side }: { trade: Trade; side: TradeSide | null }) {
  const { status } = trade.state;
  if (!steppedStatuses.includes(status)) return null;

  const offer = status === "pending";
  const completed = status === "completed";
  const paused = trade.dispute?.event.by === "staff";
  const seen = trade.items.filter((item) => item.status === "sent").length;
  const sender = partyName(trade.parties.from);
  const recipient = partyName(trade.parties.to);
  // the recipient always accepts, which for a listing is its claimer
  const accepted =
    trade.listingId === null
      ? {
          to: m.trade_page_step_accepted_offer_you({ name: sender }),
          from: m.trade_page_step_accepted_offer_them({ name: recipient }),
          staff: m.trade_page_step_accepted_offer_staff({ sender, recipient }),
        }
      : {
          to: m.trade_page_step_accepted_you({ name: sender }),
          from: m.trade_page_step_accepted_them({ name: recipient }),
          staff: m.trade_page_step_accepted_staff({
            claimer: recipient,
            poster: sender,
          }),
        };
  const steps: {
    tone: keyof typeof stepTones;
    eyebrow: string;
    title: string;
  }[] = [
    offer
      ? {
          tone: "current",
          eyebrow: m.trade_page_step({ step: 0 }),
          title:
            side === "to"
              ? m.trade_page_step_offer_you()
              : m.trade_page_step_offer_them({ name: recipient }),
        }
      : {
          tone: "done",
          eyebrow: m.trade_page_step_done({ step: 0 }),
          title: accepted[side ?? "staff"],
        },
    {
      tone: completed
        ? "done"
        : offer
          ? "todo"
          : paused
            ? "paused"
            : status === "disputed"
              ? "dispute"
              : "current",
      eyebrow: completed
        ? m.trade_page_step_done({ step: 1 })
        : paused
          ? m.trade_page_step_paused({ step: 1 })
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
  ];
  const current = offer ? 0 : completed ? 2 : 1;

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
          {/* a COSMO username can be a 42-character address */}
          <span className="text-sm font-semibold wrap-anywhere tabular-nums">
            {step.title}
          </span>
          {offer && index === 0 && (
            <span className="text-xs text-muted-foreground sm:hidden">
              {m.trade_page_step_offer_then({
                hours: CLAIM_WINDOW / 3_600_000,
              })}
            </span>
          )}
          {index === 1 &&
            (trade.items.length > 12 ? (
              <span
                aria-hidden
                className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <span
                  className="block h-full rounded-full bg-teal-500"
                  style={{ width: `${(seen / trade.items.length) * 100}%` }}
                />
              </span>
            ) : (
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
            ))}
        </li>
      ))}
    </ol>
  );
}

/**
 * Where the trade stands when it isn't simply running: how it ended, the
 * dispute that froze it, an objekt that can no longer reach its receiver,
 * or how an offer ended before it was accepted. Staff read it in the third
 * person.
 */
function StatePanel({
  trade,
  side,
  onLeave,
}: {
  trade: Trade;
  side: TradeSide | null;
  onLeave?: (feedbackWindow: FeedbackWindow) => void;
}) {
  if (trade.stage === "offer") {
    return <OfferEndedAlert trade={trade} side={side} />;
  }
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
        const receiver = otherSide(item.sender);
        return (
          <Alert key={item.id} variant="warning">
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
                      sender: partyName(trade.parties[item.sender]),
                      receiver: partyName(trade.parties[receiver]),
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
      )?.event;
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
          {staff !== undefined && "note" in staff && staff.note !== null && (
            <AlertDescription>
              <StaffNote note={staff.note} />
            </AlertDescription>
          )}
          {side !== null && onLeave !== undefined && (
            <FeedbackPrompt trade={trade} side={side} onLeave={onLeave} />
          )}
        </Alert>
      );
    }
    case "cancelled":
      return (
        <CancelledAlert
          trade={trade}
          side={side}
          onLeave={onLeave}
          cancelledBy={state.cancelledBy}
        />
      );
    case "timed_out":
      return (
        <TimedOutAlert
          trade={trade}
          side={side}
          onLeave={onLeave}
          abandoned={state.abandonedBy}
        />
      );
    default:
      return null;
  }
}

/**
 * Who cancelled the trade, the reason staff gave, that sent objekts aren't
 * moved back, and whether its parties can rate each other.
 */
function CancelledAlert({
  trade,
  side,
  onLeave,
  cancelledBy,
}: {
  trade: Trade;
  side: TradeSide | null;
  onLeave?: (feedbackWindow: FeedbackWindow) => void;
  cancelledBy: TradeSide | "staff";
}) {
  const appName = env.VITE_APP_NAME;
  const cancel = trade.events.findLast(
    ({ event }) => event.type === "cancelled",
  )?.event;
  const note = cancel !== undefined && "note" in cancel ? cancel.note : null;
  const sent = trade.items.some((item) => item.status === "sent");
  const unrated = trade.feedback.state === "ineligible";
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
      {(note !== null || sent || unrated) && (
        <AlertDescription className="flex flex-col gap-1 text-pretty [&_p:not(:last-child)]:mb-0">
          {note !== null && <StaffNote note={note} />}
          {sent && <p>{m.trade_page_not_reversed({ appName })}</p>}
          {unrated && <p>{m.feedback_no_transfer()}</p>}
        </AlertDescription>
      )}
      {side !== null && onLeave !== undefined && (
        <FeedbackPrompt trade={trade} side={side} onLeave={onLeave} compact />
      )}
    </Alert>
  );
}

/**
 * The dispute that froze the trade: who opened it and why, what happens
 * next, and when. Its note is only for moderators. A dispute staff opened
 * when a party was banned reads as a neutral pause.
 */
function DisputedAlert({
  trade,
  side,
}: {
  trade: Trade;
  side: TradeSide | null;
}) {
  const appName = env.VITE_APP_NAME;
  const { dispute } = trade;
  if (dispute === null) return null;
  const { event } = dispute;
  const paused = event.by === "staff";
  const time = () => <Timestamp date={dispute.at} format={tradeTimeFormat} />;
  return (
    <Alert
      variant={paused ? "default" : "destructive"}
      // the destructive token is just under 4.5:1 on the light card
      className={cn(
        !paused &&
          "text-red-700 *:data-[slot=alert-description]:text-red-700 dark:text-destructive dark:*:data-[slot=alert-description]:text-destructive",
      )}
    >
      {paused ? <IconPlayerPause /> : <IconFlag />}
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
      <AlertDescription className="flex flex-col gap-1 text-pretty [&_p:not(:last-child)]:mb-0">
        <p>
          {side === null
            ? paused
              ? m.trade_page_disputed_body_staff_paused()
              : m.trade_page_disputed_body_staff()
            : paused
              ? m.trade_page_disputed_body_paused()
              : m.trade_page_disputed_body()}
        </p>
        <p className="text-xs">
          {paused ? (
            <ParaglideMessage
              message={m.trade_page_disputed_meta_paused}
              inputs={{ when: "" }}
              markup={{ time }}
            />
          ) : (
            <ParaglideMessage
              message={m.trade_page_disputed_meta}
              inputs={{ when: "", report: event.reportId.slice(0, 8) }}
              markup={{ time }}
            />
          )}
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
  onLeave,
  abandoned,
}: {
  trade: Trade;
  side: TradeSide | null;
  onLeave?: (feedbackWindow: FeedbackWindow) => void;
  abandoned: TradeSide[];
}) {
  const appName = env.VITE_APP_NAME;
  const listing =
    trade.listingId === null ? undefined : (
      <ViewListingLink
        listingId={trade.listingId}
        className={cn(
          side === null && "mt-2 group-has-[>svg]/alert:col-start-2",
        )}
      />
    );
  const owed = (sender: TradeSide) =>
    trade.items.filter(
      (item) => item.sender === sender && item.status !== "sent",
    ).length;
  return (
    <Alert variant="warning">
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
      <AlertDescription className="flex flex-col gap-1 text-pretty [&_p:not(:last-child)]:mb-0">
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
      {side === null || onLeave === undefined ? (
        listing
      ) : (
        <FeedbackPrompt
          trade={trade}
          side={side}
          onLeave={onLeave}
          compact
          actions={listing}
        />
      )}
    </Alert>
  );
}

// the way back to the listing a timed-out trade came from
function ViewListingLink({
  listingId,
  className,
}: {
  listingId: string;
  className?: string;
}) {
  return (
    <Link
      to="/market/listing/$id"
      params={{ id: listingId }}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "w-fit no-underline!",
        className,
      )}
    >
      {m.trade_page_view_listing()}
    </Link>
  );
}

/**
 * The reason staff gave when they ended the trade, which may be one long
 * unbroken string such as a link.
 */
function StaffNote({ note }: { note: string }) {
  return (
    <p dir="auto" className="wrap-anywhere">
      {m.trade_page_reason_given({ note })}
    </p>
  );
}

/**
 * A party to the trade: their avatar and name, linking to their profile
 * when they have a COSMO username, whether they posted or accepted the
 * listing, or sent or received the offer, and their rating, which a deleted
 * party has none of.
 */
function PartyCard({ party, role }: { party: TradeParty; role: string }) {
  return (
    <Item variant="outline" className="bg-card">
      <ItemMedia>
        <PartyAvatar party={party} className="size-9 text-sm **:p-1.5" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="max-w-full">
          <PartyLink party={party} />
        </ItemTitle>
        <ItemDescription>{role}</ItemDescription>
        {party.user !== null && (
          <FeedbackBadge variant="full" rep={party.rep} />
        )}
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
