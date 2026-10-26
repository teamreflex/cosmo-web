import { m } from "@/i18n/messages";
import { itemName, partyName, tradeTimeFormat } from "@/lib/client/trades";
import { env } from "@/lib/env/client";
import type { TradeView } from "@/lib/universal/trades";
import { cn } from "@/lib/utils";
import type { TradeSide } from "@apollo/database/web/types";
import { otherSide } from "@apollo/trades/lifecycle";
import { CLAIM_WINDOW, OFFER_WINDOW } from "@apollo/trades/timers";
import { ParaglideMessage } from "@inlang/paraglide-js-react";
import {
  IconArrowBackUp,
  IconArrowsExchange,
  IconCheck,
  IconExchangeOff,
  IconHourglassEmpty,
  IconX,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import Countdown from "../misc/countdown";
import { bold } from "../notifications/row-utils";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button, buttonVariants } from "../ui/button";
import { Timestamp } from "../ui/timestamp";
import type { OfferAction } from "./offer-action-dialog";

// a trade still on its offer's step 0, a direct offer, a counter or an offer on a listing, or ended there
export type OfferTrade = Extract<TradeView, { stage: "offer" }>;

// what a party can do with a pending offer: answer it in a confirmation, or counter it in a sheet
export type OfferButton = OfferAction | "counter";

const actionButtons = {
  decline: {
    variant: "outline",
    icon: IconX,
    label: m.trade_page_offer_decline,
  },
  counter: {
    variant: "outline",
    icon: IconArrowsExchange,
    label: m.trade_page_offer_counter,
  },
  accept: {
    variant: "cosmo",
    icon: IconCheck,
    label: m.trade_page_offer_accept,
  },
  withdraw: {
    variant: "outline",
    icon: IconArrowBackUp,
    label: m.trade_page_offer_withdraw,
  },
} as const satisfies Record<
  OfferButton,
  {
    variant: "outline" | "cosmo";
    icon: typeof IconX;
    label: () => string;
  }
>;

/**
 * The buttons that open each of a pending offer's confirmations, or the
 * counter sheet, in the order given.
 */
export function OfferActions({
  actions,
  onOpen,
  className,
}: {
  actions: OfferButton[];
  onOpen: (action: OfferButton) => void;
  className?: string;
}) {
  return actions.map((action) => {
    const { variant, icon: Icon, label } = actionButtons[action];
    return (
      <Button
        key={action}
        variant={variant}
        className={className}
        onClick={() => onOpen(action)}
      >
        <Icon />
        {label()}
      </Button>
    );
  });
}

/**
 * The strip under a pending offer's transfers. The side that didn't propose
 * it reads that nothing counts until they accept; its proposer, or staff,
 * read what was offered, when, and how long the other side has to answer.
 * A counter also links back to the offer it answers.
 */
export function OfferStrip({
  trade,
  side,
  children,
}: {
  trade: OfferTrade;
  side: TradeSide | null;
  /** the viewer's actions, or nothing when none apply */
  children?: ReactNode;
}) {
  const answeredBy = otherSide(trade.proposedBy);
  const recipient = partyName(trade.parties[answeredBy]);
  // a counter names the offer it answers, and links back to it
  const { parentId } = trade;
  const parent =
    parentId === null ? null : (
      <p className="text-xs text-muted-foreground">
        <ParaglideMessage
          message={
            side === answeredBy
              ? m.trade_page_offer_counter_them
              : m.trade_page_offer_counter_of
          }
          inputs={{
            name:
              side === answeredBy
                ? partyName(trade.parties[trade.proposedBy])
                : recipient,
          }}
          markup={{
            ...bold,
            link: ({ children: label }) => (
              <Link
                to="/trade/$id"
                params={{ id: parentId }}
                className="text-cosmo hover:underline dark:text-cosmo-text"
              >
                {label}
              </Link>
            ),
          }}
        />
      </p>
    );

  if (side === answeredBy) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-4 py-3">
        <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-0.5 wrap-anywhere">
          <p className="text-sm text-muted-foreground">
            <ParaglideMessage
              message={m.trade_page_offer_accept_note}
              inputs={{ hours: CLAIM_WINDOW / 3_600_000 }}
              markup={bold}
            />
          </p>
          {parent}
        </div>
        {children}
      </div>
    );
  }

  const counts = {
    give: trade.items.filter((item) => item.sender === trade.proposedBy).length,
    get: trade.items.filter((item) => item.sender === answeredBy).length,
  };
  const sender = partyName(trade.parties[trade.proposedBy]);
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-0.5 text-sm wrap-anywhere">
        <p className="font-medium">
          {side === trade.proposedBy
            ? (parentId === null
                ? m.trade_page_offer_waiting_you
                : m.trade_page_offer_waiting_counter_you)({
                name: recipient,
                ...counts,
              })
            : (parentId === null
                ? m.trade_page_offer_waiting_staff
                : m.trade_page_offer_waiting_counter_staff)({
                sender,
                recipient,
                ...counts,
              })}
        </p>
        <p className="text-xs text-muted-foreground">
          <ParaglideMessage
            message={
              // an offer on a listing, which its poster answers, can't be countered
              trade.proposedBy === "to"
                ? m.trade_page_offer_listing_waiting_meta
                : m.trade_page_offer_waiting_meta
            }
            inputs={{ sent: "", left: "" }}
            markup={{
              time: () => (
                <Timestamp
                  date={new Date(trade.expiresAt.getTime() - OFFER_WINDOW)}
                  format={tradeTimeFormat}
                />
              ),
              countdown: () => <Countdown deadline={trade.expiresAt} />,
            }}
          />
        </p>
        {parent}
      </div>
      {children}
    </div>
  );
}

/**
 * How an offer ended before it was accepted, worded for the viewer, or in
 * the third person for staff: declined, withdrawn, closed by staff banning
 * a party (never saying who), by an account being deleted or by the
 * listing it offered on closing, countered (with what the counter swapped
 * and the way to it), expired, or stale (naming the objekt and whether it
 * left its holder's account or turned untransferable, or saying the poster
 * edited the listing).
 */
export function OfferEndedAlert({
  trade,
  side,
}: {
  trade: OfferTrade;
  side: TradeSide | null;
}) {
  const answeredBy = otherSide(trade.proposedBy);
  const sender = partyName(trade.parties[trade.proposedBy]);
  const recipient = partyName(trade.parties[answeredBy]);

  if (trade.closer !== null) {
    return (
      <Alert>
        <IconX />
        <AlertTitle>
          {trade.closer === "staff"
            ? m.trade_page_offer_closed_staff({ appName: env.VITE_APP_NAME })
            : trade.closer === "deletion"
              ? m.trade_page_offer_closed_deletion()
              : m.trade_page_offer_closed_listing()}
        </AlertTitle>
        <AlertDescription>{m.trade_page_offer_nothing_sent()}</AlertDescription>
      </Alert>
    );
  }

  switch (trade.state.status) {
    case "declined":
      return (
        <Alert>
          <IconX />
          <AlertTitle>
            {side === trade.proposedBy
              ? m.trade_page_offer_declined_them({ name: recipient })
              : side === answeredBy
                ? m.trade_page_offer_declined_you({ name: sender })
                : m.trade_page_offer_declined_staff({ sender, recipient })}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-1 text-pretty [&_p:not(:last-child)]:mb-0">
            <p>{m.trade_page_offer_nothing_sent()}</p>
            <NewOfferNote trade={trade} side={side} />
          </AlertDescription>
        </Alert>
      );
    case "withdrawn":
      return (
        <Alert>
          <IconArrowBackUp />
          <AlertTitle>
            {side === trade.proposedBy
              ? m.trade_page_offer_withdrawn_you()
              : m.trade_page_offer_withdrawn_them({ name: sender })}
          </AlertTitle>
          <AlertDescription>
            {side === answeredBy
              ? m.trade_page_offer_withdrawn_before_you()
              : m.trade_page_offer_withdrawn_before_them({ name: recipient })}
          </AlertDescription>
        </Alert>
      );
    case "countered":
      return <CounteredAlert trade={trade} side={side} />;
    case "expired":
      return (
        <Alert>
          <IconHourglassEmpty />
          <AlertTitle>
            {side === answeredBy
              ? m.trade_page_offer_expired_you()
              : m.trade_page_offer_expired_them({ name: recipient })}
          </AlertTitle>
          <AlertDescription>
            {m.trade_page_offer_expired_note({
              hours: OFFER_WINDOW / 3_600_000,
            })}
          </AlertDescription>
        </Alert>
      );
    case "stale": {
      const stale = trade.events
        .flatMap(({ event }) => (event.type === "stale" ? [event] : []))
        .at(-1);
      // the poster edited the listing, which is always their (`from`) side
      if (stale?.reason === "edited") {
        return (
          <Alert variant="destructive">
            <IconExchangeOff />
            <AlertTitle>
              {side === "from"
                ? m.trade_page_offer_stale_edited_you()
                : m.trade_page_offer_stale_edited_them({
                    name: partyName(trade.parties.from),
                  })}
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-1 text-pretty [&_p:not(:last-child)]:mb-0">
              <p>{m.trade_page_offer_stale_edited_note()}</p>
              <NewOfferNote trade={trade} side={side} />
            </AlertDescription>
          </Alert>
        );
      }
      const item = trade.items.find(
        ({ tokenId }) => tokenId === stale?.tokenId,
      );
      return (
        <Alert variant="destructive">
          <IconExchangeOff />
          <AlertTitle>
            {item === undefined
              ? m.trade_page_offer_stale_unknown()
              : stale?.reason === "untransferable"
                ? m.trade_page_offer_stale_untransferable({
                    objekt: itemName(item),
                  })
                : item.sender === side
                  ? m.trade_page_offer_stale_yours({ objekt: itemName(item) })
                  : m.trade_page_offer_stale_theirs({
                      objekt: itemName(item),
                      name: partyName(trade.parties[item.sender]),
                    })}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-1 text-pretty [&_p:not(:last-child)]:mb-0">
            <p>{m.trade_page_offer_stale_note()}</p>
            <NewOfferNote trade={trade} side={side} eitherParty />
          </AlertDescription>
        </Alert>
      );
    }
    default:
      return null;
  }
}

/**
 * Where an ended offer's proposer can send a new one: the listing an offer
 * on a listing was on, else Trade Matches, where `eitherParty` also tells
 * the other side of a direct offer. Only the claimer can offer on a listing
 * again.
 */
function NewOfferNote({
  trade,
  side,
  eitherParty = false,
}: {
  trade: OfferTrade;
  side: TradeSide | null;
  eitherParty?: boolean;
}) {
  const { listingId } = trade;
  const shown =
    eitherParty && listingId === null
      ? side !== null
      : side === trade.proposedBy;
  if (!shown) return null;
  return (
    <p>
      {listingId === null ? (
        m.trade_page_offer_new_from_matches()
      ) : (
        <ParaglideMessage
          message={m.trade_page_offer_new_from_listing}
          markup={{
            link: ({ children }) => (
              <Link
                to="/market/listing/$id"
                params={{ id: listingId }}
                className="text-cosmo hover:underline dark:text-cosmo-text"
              >
                {children}
              </Link>
            ),
          }}
        />
      )}
    </p>
  );
}

/**
 * The counter that ended an offer: what it swapped, as "@B countered: KimLip
 * 103Z #00218 instead of KimLip 101Z #00731" when it both added and dropped
 * objekts, what to do about the counter while it waits for an answer, and
 * the way to it, in the phone bar below tablet width for a party. Only the
 * side that didn't propose the offer counters.
 */
function CounteredAlert({
  trade,
  side,
}: {
  trade: OfferTrade;
  side: TradeSide | null;
}) {
  const { counter } = trade;
  const answeredBy = otherSide(trade.proposedBy);
  const recipient = partyName(trade.parties[answeredBy]);
  const offered = new Set(trade.items.map((item) => item.tokenId));
  const countered = new Set(counter?.items.map((item) => item.tokenId));
  const added = (counter?.items ?? [])
    .filter((item) => !offered.has(item.tokenId))
    .map(itemName)
    .join(", ");
  const removed = trade.items
    .filter((item) => item.tokenId !== null && !countered.has(item.tokenId))
    .map(itemName)
    .join(", ");
  const swapped = added !== "" && removed !== "";

  return (
    <Alert className="border-cosmo/40 *:[svg]:text-cosmo dark:*:[svg]:text-cosmo-text">
      <IconArrowsExchange />
      <AlertTitle className="wrap-anywhere">
        {side === answeredBy
          ? swapped
            ? m.trade_page_offer_countered_you_swap({ added, removed })
            : m.trade_page_offer_countered_you()
          : swapped
            ? m.trade_page_offer_countered_them_swap({
                name: recipient,
                added,
                removed,
              })
            : m.trade_page_offer_countered_them({ name: recipient })}
      </AlertTitle>
      <AlertDescription>
        {/* once the counter is answered or ended, its own page says how */}
        {counter !== null && !counter.pending
          ? m.trade_page_offer_countered_note_answered()
          : side === trade.proposedBy
            ? m.trade_page_offer_countered_note_you()
            : side === answeredBy
              ? m.trade_page_offer_countered_note_them({
                  name: partyName(trade.parties[trade.proposedBy]),
                })
              : m.trade_page_offer_countered_note_staff()}
      </AlertDescription>
      {counter !== null && (
        <CounterLink
          counterId={counter.id}
          className={cn(
            "mt-2 group-has-[>svg]/alert:col-start-2",
            side !== null && "max-md:hidden",
          )}
        />
      )}
    </Alert>
  );
}

// the way from a countered offer to its counter
export function CounterLink({
  counterId,
  className,
}: {
  counterId: string;
  className?: string;
}) {
  return (
    <Link
      to="/trade/$id"
      params={{ id: counterId }}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "w-fit no-underline!",
        className,
      )}
    >
      {m.trade_page_offer_view_counter()}
    </Link>
  );
}
