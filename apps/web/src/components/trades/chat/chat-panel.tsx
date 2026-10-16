import {
  ReportFormDialog,
  ReportQuote,
} from "@/components/reports/report-dialog";
import { Badge } from "@/components/ui/badge";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Marker, MarkerContent } from "@/components/ui/marker";
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "@/components/ui/timestamp";
import { m } from "@/i18n/messages";
import { ChatClient, conversationAtom } from "@/lib/client/chat";
import type { Conversation } from "@/lib/client/chat-conversation";
import { formatCount } from "@/lib/client/trade-listings";
import {
  chatDayFormat,
  chatTimeFormat,
  partyName,
  tradeTimeFormat,
} from "@/lib/client/trades";
import { env } from "@/lib/env/client";
import { currentAccountQuery, removeViewerQueries } from "@/lib/queries/core";
import { tradeQuery } from "@/lib/queries/trades";
import type { TradeView } from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import {
  type ChatItem,
  isKnownEvent,
  MAX_MESSAGE_LENGTH,
} from "@apollo/chat/items";
import { sanitizeMessage } from "@apollo/chat/sanitize";
import {
  type MessageReportReason,
  messageReportReasons,
  type TradeSide,
} from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import { CHAT_RETENTION_DAYS } from "@apollo/trades/timers";
import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import { useMessageScrollerScrollable } from "@shadcn/react/message-scroller";
import {
  IconArrowDown,
  IconDots,
  IconLoader2,
  IconSend2,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Cause, Exit, Option, Redacted } from "effect";
import { AsyncResult } from "effect/reactivity";
import {
  type KeyboardEvent,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import { describeEvent, eventNote } from "../trade-events";
import {
  type ChatEvent,
  type ChatMessage,
  type ChatRow,
  chatRows,
  unreadAfter,
} from "./chat-rows";
import { useChatArrivals } from "./use-chat-arrivals";

type Props = {
  trade: TradeView;
  // the viewer's side, or null for staff, who read it without sending
  side: TradeSide | null;
  // one of the other party's messages arrived after the history
  onIncoming?: () => void;
  className?: string;
};

/**
 * A trade's chat: its messages and events as they happen, and a composer
 * while the trade is live. Staff read it while the trade or one of its
 * messages has an open report. A trade event refetches the trade, so the
 * page around it stays current.
 */
export default function ChatPanel({
  trade,
  side,
  onIncoming,
  className,
}: Props) {
  const result = useAtomValue(conversationAtom(trade.id));
  const retry = useAtomRefresh(conversationAtom(trade.id));
  const ended = trade.endedAt !== null;
  const failed = AsyncResult.isFailure(result);
  const refusal = failed
    ? Option.getOrUndefined(Cause.findErrorOption(result.cause))?._tag
    : undefined;
  useSignedOutCheck(refusal === "Unauthorized");

  /**
   * Chat is the page's only live feed of the trade: when the other party,
   * staff or the transfer drain moves the trade on, its event arrives here
   * and the page refetches the trade. An event the page already has, such
   * as the viewer's own action, or a removal changes nothing.
   */
  const queryClient = useQueryClient();
  const pageEvent = trade.events.at(-1)?.id ?? 0;
  const changesPage = (item: ChatItem) =>
    item._tag === "Event" &&
    item.id > pageEvent &&
    !(isKnownEvent(item.event) && item.event.type === "message_removed");

  function refetchTrade() {
    void queryClient.invalidateQueries({
      queryKey: tradeQuery(trade.id).queryKey,
    });
  }

  useChatArrivals(trade.id, {
    // an event that landed between the page loading and the chat joining
    onHistory: (items) => {
      if (items.some(changesPage)) refetchTrade();
    },
    onEvent: (event) => {
      if (changesPage(event)) refetchTrade();
    },
    onMessage: (message) => {
      if (side !== null && message.sender !== side) onIncoming?.();
    },
  });

  return (
    <section
      aria-labelledby={`chat-${trade.id}`}
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card text-sm",
        className,
        // a chat that can't be read only needs room to say why
        failed && "h-auto min-h-0",
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
        <h2 id={`chat-${trade.id}`} className="font-semibold">
          {m.chat_title()}
        </h2>
        {(side === null || ended) && (
          <Badge variant="outline" className="ml-auto">
            {m.chat_read_only()}
          </Badge>
        )}
      </header>
      {failed ? (
        <ChatEnded closed={refusal === "StaffAccessRequired"} onRetry={retry} />
      ) : AsyncResult.isSuccess(result) &&
        (result.value.live || result.value.items.length > 0) ? (
        <Conversation trade={trade} side={side} conversation={result.value} />
      ) : (
        <ChatSkeleton />
      )}
    </section>
  );
}

/**
 * Chat refuses a viewer whose session ended elsewhere: signed out on
 * another device, or banned. Once the app agrees they're signed out, the
 * page drops to its signed-out view, as signing out here would.
 */
function useSignedOutCheck(refused: boolean) {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    if (!refused) return;
    void (async () => {
      const account = await queryClient.query({
        ...currentAccountQuery,
        staleTime: 0,
      });
      if (account !== null) return;
      await router.invalidate();
      // after the page left the trade, so nothing mounted refetches it
      removeViewerQueries(queryClient);
      router.clearCache();
    })();
  }, [refused, queryClient, router]);
}

function Conversation({
  trade,
  side,
  conversation: { items, live },
}: {
  trade: TradeView;
  side: TradeSide | null;
  conversation: Conversation;
}) {
  const [reporting, setReporting] = useState<ChatMessage | null>(null);
  const rows = chatRows(items);
  const canSend =
    side !== null &&
    (trade.state.status === "accepted" || trade.state.status === "disputed");

  return (
    <>
      {!live && (
        <p
          role="status"
          className="border-b border-border bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-300"
        >
          {m.chat_reconnecting()}
        </p>
      )}
      <MessageScrollerProvider autoScroll defaultScrollPosition="end">
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport>
            <MessageScrollerContent className="px-3 py-3">
              {rows.length === 0 ? (
                <p className="m-auto px-4 text-center text-muted-foreground">
                  {m.chat_empty()}
                </p>
              ) : (
                rows.map((row) => (
                  <MessageScrollerItem
                    key={row.key}
                    messageId={row.key}
                    // a run's bubbles sit closer together than separate rows
                    className={cn(
                      row.kind === "message" && !row.first && "-mt-1.5",
                    )}
                  >
                    <Row
                      row={row}
                      trade={trade}
                      side={side}
                      onReport={setReporting}
                    />
                  </MessageScrollerItem>
                ))
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <LatestButton items={items} side={side} />
        </MessageScroller>
      </MessageScrollerProvider>
      {canSend ? (
        <Composer tradeId={trade.id} />
      ) : (
        <ReadOnlyNote trade={trade} side={side} />
      )}
      {side !== null && (
        <ReportMessageDialog
          message={reporting}
          name={partyName(trade.parties[otherSide(side)])}
          onClose={() => setReporting(null)}
        />
      )}
    </>
  );
}

function Row({
  row,
  trade,
  side,
  onReport,
}: {
  row: ChatRow;
  trade: TradeView;
  side: TradeSide | null;
  onReport: (message: ChatMessage) => void;
}) {
  switch (row.kind) {
    case "day":
      return (
        <Marker variant="separator" className="py-1 text-xs">
          <MarkerContent>
            <Timestamp date={row.date} format={chatDayFormat} />
          </MarkerContent>
        </Marker>
      );
    case "event":
      return <EventMarker event={row.event} trade={trade} side={side} />;
    case "message":
      return (
        <MessageRow row={row} trade={trade} side={side} onReport={onReport} />
      );
  }
}

/**
 * A trade event between the messages, worded as the timeline words it,
 * with the reason staff gave. An event this client doesn't know yet reads
 * as a plain update.
 */
function EventMarker({
  event: { at, event },
  trade,
  side,
}: {
  event: ChatEvent;
  trade: TradeView;
  side: TradeSide | null;
}) {
  const known = isKnownEvent(event) ? event : null;
  const line =
    known === null ? m.chat_event_unknown() : describeEvent(trade, side, known);
  if (line === null) return null;
  const note = known === null ? null : eventNote(known);

  return (
    <Marker variant="event">
      <MarkerContent className="flex flex-col gap-0.5">
        <span className="wrap-anywhere">
          <Timestamp
            date={at}
            format={chatTimeFormat}
            className="font-mono tabular-nums"
          />
          {" · "}
          {line}
        </span>
        {note !== null && (
          <span dir="auto" className="wrap-anywhere text-muted-foreground">
            {m.trade_page_reason_given({ note })}
          </span>
        )}
      </MarkerContent>
    </Marker>
  );
}

/**
 * A message as plain text. The viewer's own sit at the end; staff see the
 * poster's at the start and the claimer's at the end, each run named.
 */
function MessageRow({
  row: { message, first, last },
  trade,
  side,
  onReport,
}: {
  row: Extract<ChatRow, { kind: "message" }>;
  trade: TradeView;
  side: TradeSide | null;
  onReport: (message: ChatMessage) => void;
}) {
  const own = side !== null && message.sender === side;
  const align =
    own || (side === null && message.sender === "to") ? "end" : "start";
  const body = message.body === null ? null : Redacted.value(message.body);

  return (
    <Message align={align} className="group/row">
      <MessageContent className="gap-1">
        {side === null && first && message.sender !== null && (
          <MessageHeader>
            {partyName(trade.parties[message.sender])}
          </MessageHeader>
        )}
        <div className="flex items-center gap-1 group-data-[align=end]/message:flex-row-reverse">
          <Bubble
            align={align}
            variant={body === null ? "outline" : own ? "cosmo" : "secondary"}
          >
            <BubbleContent
              dir="auto"
              className={cn(
                "whitespace-pre-wrap",
                body === null &&
                  "border-dashed border-border text-muted-foreground italic",
                // the run's last bubble points at its sender
                last && (align === "end" ? "rounded-br-xs" : "rounded-bl-xs"),
              )}
            >
              {body ??
                (message.removed
                  ? m.chat_message_removed({ appName: env.VITE_APP_NAME })
                  : m.chat_message_deleted())}
            </BubbleContent>
          </Bubble>
          {body !== null && (
            <MessageActions
              body={body}
              reportable={side !== null && !own && message.sender !== null}
              onReport={() => onReport(message)}
            />
          )}
        </div>
        {last && (
          <MessageFooter>
            <Timestamp
              date={message.sentAt}
              format={chatTimeFormat}
              className="font-mono tabular-nums"
            />
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}

function MessageActions({
  body,
  reportable,
  onReport,
}: {
  body: string;
  reportable: boolean;
  onReport: () => void;
}) {
  const [, copy] = useCopyToClipboard();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={m.chat_message_actions()}
            className="shrink-0 text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"
          />
        }
      >
        <IconDots />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={async () => {
            if (await copy(body)) {
              toast.success(m.toast_copied_clipboard());
            }
          }}
        >
          {m.chat_copy_text()}
        </DropdownMenuItem>
        {reportable && (
          <DropdownMenuItem variant="destructive" onClick={onReport}>
            {m.chat_report_message()}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Scrolls to the newest message, counting the other party's messages that
 * arrived while the reader was scrolled up.
 */
function LatestButton({
  items,
  side,
}: {
  items: Conversation["items"];
  side: TradeSide | null;
}) {
  const scrollable = useMessageScrollerScrollable();
  const newest = items.at(-1)?.id ?? 0;
  const [seen, setSeen] = useState(newest);
  // at the bottom everything is read
  if (!scrollable.end && seen !== newest) {
    setSeen(newest);
  }
  const unread = unreadAfter(items, side, seen);

  return (
    <MessageScrollerButton
      size={unread > 0 ? "sm" : "icon-sm"}
      className={cn(unread > 0 && "rounded-full")}
    >
      <IconArrowDown />
      {unread > 0 ? (
        <span>{m.chat_unread({ count: unread })}</span>
      ) : (
        <span className="sr-only">{m.chat_scroll_to_end()}</span>
      )}
    </MessageScrollerButton>
  );
}

const errorText = {
  too_long: () => m.chat_too_long({ max: formatCount(MAX_MESSAGE_LENGTH) }),
  rate_limited: m.chat_rate_limited,
  failed: m.chat_send_failed,
};

/**
 * Sends on Enter (Shift+Enter for a new line). The text stays until the
 * message is sent, and the counter shows as the limit nears.
 */
function Composer({ tradeId }: { tradeId: string }) {
  const id = useId();
  const queryClient = useQueryClient();
  const send = useAtomSet(ChatClient.mutation("Send"), { mode: "promiseExit" });
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [failure, setFailure] = useState<"rate_limited" | "failed" | null>(
    null,
  );
  const body = sanitizeMessage(text);
  const tooLong = body.length > MAX_MESSAGE_LENGTH;
  const error = tooLong ? "too_long" : failure;

  function submit() {
    if (body === "" || tooLong || pending) return;
    startTransition(async () => {
      const exit = await send({
        payload: { tradeId, body: Redacted.make(body) },
      });
      if (Exit.isSuccess(exit)) {
        setText("");
        setFailure(null);
        return;
      }
      const reason = Option.getOrUndefined(Cause.findErrorOption(exit.cause));
      if (reason?._tag === "ChatReadOnly") {
        // the trade ended meanwhile; the refetched page drops the composer
        void queryClient.invalidateQueries({
          queryKey: tradeQuery(tradeId).queryKey,
        });
      }
      setFailure(reason?._tag === "RateLimited" ? "rate_limited" : "failed");
    });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      className="border-t border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Field>
        <InputGroup>
          <InputGroupTextarea
            id={id}
            aria-label={m.chat_composer_label()}
            aria-invalid={error !== null}
            placeholder={m.chat_composer_label()}
            rows={1}
            className="field-sizing-content max-h-32 min-h-0 panel-scrollbar"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setFailure(null);
            }}
            onKeyDown={onKeyDown}
          />
          <InputGroupAddon align="block-end">
            <InputGroupText
              className={cn(
                "self-end font-mono text-xxs tabular-nums",
                tooLong && "text-destructive",
              )}
            >
              {m.chat_length({
                length: formatCount(body.length),
                max: formatCount(MAX_MESSAGE_LENGTH),
              })}
            </InputGroupText>
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              className="ml-auto"
              aria-label={m.chat_send()}
              disabled={body === "" || tooLong || pending}
            >
              {pending ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconSend2 />
              )}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {error !== null && (
          <FieldError errors={[{ message: errorText[error]() }]} />
        )}
      </Field>
    </form>
  );
}

/**
 * Why there's no composer: staff only read, and an ended trade's chat is
 * read-only, with its bodies deleted CHAT_RETENTION_DAYS later.
 */
function ReadOnlyNote({
  trade,
  side,
}: {
  trade: TradeView;
  side: TradeSide | null;
}) {
  const [now] = useState(Date.now);
  if (side === null) {
    return (
      <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        {m.chat_staff_view()}
      </p>
    );
  }
  const { endedAt } = trade;
  if (endedAt === null) return null;
  const status = trade.state.status;
  const deletedAt = new Date(
    endedAt.getTime() + CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const date = (when: Date) => () => (
    <Timestamp date={when} format={tradeTimeFormat} />
  );

  return (
    <div className="flex flex-col gap-1 border-t border-border px-4 py-3 text-xs text-muted-foreground">
      <p>
        <ParaglideMessage
          message={
            status === "completed"
              ? m.chat_read_only_completed
              : status === "cancelled"
                ? m.chat_read_only_cancelled
                : m.chat_read_only_timed_out
          }
          inputs={{ date: "" }}
          markup={{ date: date(endedAt) }}
        />
      </p>
      <p>
        <ParaglideMessage
          message={
            deletedAt.getTime() <= now
              ? m.chat_retention_deleted
              : m.chat_retention_pending
          }
          inputs={{ date: "", days: CHAT_RETENTION_DAYS }}
          markup={{ date: date(deletedAt) }}
        />
      </p>
    </div>
  );
}

/**
 * Reports one of the other party's messages. The report keeps its own copy
 * of the message, which moderators read even after it's deleted.
 */
function ReportMessageDialog({
  message,
  name,
  onClose,
}: {
  message: ChatMessage | null;
  name: string;
  onClose: () => void;
}) {
  const report = useAtomSet(ChatClient.mutation("Report"), {
    mode: "promiseExit",
  });
  const [pending, startTransition] = useTransition();
  // the dialog keeps the message on screen while it closes
  const [shown, setShown] = useState(message);
  if (message !== null && message !== shown) {
    setShown(message);
  }

  function submit({
    reason,
    note,
  }: {
    reason: MessageReportReason;
    note: string | undefined;
  }) {
    if (shown === null) return;
    startTransition(async () => {
      const exit = await report({
        payload:
          note === undefined
            ? { messageId: shown.id, reason }
            : { messageId: shown.id, reason, note },
      });
      if (Exit.isSuccess(exit)) {
        toast.success(m.report_sent());
        onClose();
        return;
      }
      const error = Option.getOrUndefined(Cause.findErrorOption(exit.cause));
      switch (error?._tag) {
        case "AlreadyReported":
          toast.error(m.chat_report_already());
          onClose();
          return;
        case "RateLimited":
          toast.error(m.report_rate_limited_title(), {
            description: m.report_rate_limited_description(),
          });
          return;
        case "MessageNotFound":
          toast.error(m.chat_report_gone());
          onClose();
          return;
        default:
          toast.error(m.chat_unavailable());
      }
    });
  }

  return (
    <ReportFormDialog
      title={m.chat_report_message()}
      description={m.chat_report_description({ name })}
      quote={
        shown !== null &&
        shown.body !== null && (
          <ReportQuote
            by={
              <>
                {name} ·{" "}
                <Timestamp date={shown.sentAt} format={tradeTimeFormat} />
              </>
            }
          >
            <span dir="auto" className="wrap-anywhere whitespace-pre-wrap">
              {Redacted.value(shown.body)}
            </span>
          </ReportQuote>
        )
      }
      reasons={messageReportReasons}
      submitLabel={m.chat_report_submit()}
      pending={pending}
      onSubmit={submit}
      open={message !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    />
  );
}

/**
 * Why the chat can't be read. Staff are told when it's closed to them;
 * anything else offers another try.
 */
function ChatEnded({
  closed,
  onRetry,
}: {
  // the viewer is staff and the trade has no open report
  closed: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="font-medium">
        {closed ? m.chat_closed_to_staff() : m.chat_unavailable()}
      </p>
      {closed ? (
        <p className="text-xs text-muted-foreground">
          {m.chat_closed_to_staff_body()}
        </p>
      ) : (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {m.chat_try_again()}
        </Button>
      )}
    </div>
  );
}

function ChatSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-3">
      <Skeleton className="h-9 w-2/3 rounded-lg" />
      <Skeleton className="ml-auto h-9 w-1/2 rounded-lg" />
      <Skeleton className="h-9 w-3/5 rounded-lg" />
    </div>
  );
}
