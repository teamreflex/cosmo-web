import type {
  ListingStatus,
  TradeCanceller,
  TradeOffer,
  TradeOfferItem,
  TradeSide,
  TradeStatus,
} from "@apollo/database/web/types";

export type TradeItemState =
  | { kind: "objekt"; sender: TradeSide; transferred: boolean }
  | {
      kind: "payment";
      sender: TradeSide;
      markedPaid: boolean;
      confirmed: boolean;
    };

/**
 * A trade's status and what each of its items has done, which is all a
 * transition needs. Cancelled and timed-out trades carry who cancelled or
 * abandoned them, matching the table's checks.
 */
export type TradeState = (
  | { status: "cancelled"; cancelledBy: TradeCanceller }
  | { status: "timed_out"; abandonedBy: [TradeSide, ...TradeSide[]] }
  | { status: Exclude<TradeStatus, "cancelled" | "timed_out"> }
) & { items: readonly TradeItemState[] };

/**
 * Party events carry the side acting. Item events name the item by its index
 * in `items`. The rest come from the drain, the timers or staff.
 */
export type TradeEvent =
  // the recipient answers a pending direct offer
  | { type: "accept"; by: TradeSide }
  | { type: "decline"; by: TradeSide }
  | { type: "counter"; by: TradeSide }
  // the sender takes back a pending direct offer
  | { type: "withdraw"; by: TradeSide }
  // a pending offer went unanswered for 72 hours
  | { type: "expire" }
  // a pending offer's token moved
  | { type: "go_stale" }
  // the drain saw a token reach its receiver
  | { type: "transfer"; item: number }
  | { type: "mark_paid"; item: number; by: TradeSide }
  | { type: "confirm_payment"; item: number; by: TradeSide }
  | { type: "cancel"; by: TradeSide }
  // a party opens a dispute, or a ban freezes the trade as staff
  | { type: "dispute"; by: TradeCanceller }
  // the deadline passed the drain's watermark
  | { type: "time_out" }
  | { type: "staff_complete" }
  | { type: "staff_cancel" }
  /**
   * Staff gave a disputed trade a new deadline, which unfreezes it, or
   * completes it when everything already arrived.
   */
  | { type: "staff_extend" };

export type TransitionRefusal =
  // the event can't happen in the trade's current status
  | "wrong_status"
  // the side acting can't take this action
  | "wrong_party"
  // something was sent or marked paid, so cancelling needs a dispute
  | "already_started"
  // the item already did what the event says
  | "already_done"
  // the item doesn't exist or is the wrong kind for the event
  | "no_such_item";

export type TransitionResult =
  | { ok: true; trade: TradeState }
  | { ok: false; reason: TransitionRefusal };

const refuse = (reason: TransitionRefusal): TransitionResult => ({
  ok: false,
  reason,
});

/**
 * Move a trade through its lifecycle, or say why the event can't happen.
 *
 * A direct offer starts pending and the recipient accepts, declines or
 * counters it; a trade from a listing starts accepted. Once accepted, either
 * party may cancel only while nothing has been sent or marked paid; after
 * that, a dispute is the only way out. A dispute freezes the deadline, mark
 * paid and cancelling. Transfers and confirmations are still recorded while
 * disputed, but only staff complete, cancel or extend a disputed trade. An
 * accepted trade completes once every token has arrived and every payment is
 * confirmed, which an extend checks too.
 */
export function transition(
  trade: TradeState,
  event: TradeEvent,
): TransitionResult {
  switch (event.type) {
    case "accept":
    case "decline":
    case "counter":
    case "withdraw":
    case "expire":
    case "go_stale":
      return answerOffer(trade, event);
    case "transfer":
    case "mark_paid":
    case "confirm_payment":
      return updateItem(trade, event);
    case "cancel":
    case "dispute":
    case "time_out":
      return endEarly(trade, event);
    case "staff_complete":
    case "staff_cancel":
    case "staff_extend":
      return resolveAsStaff(trade, event);
  }
}

export type PartyActionRefusal = TransitionRefusal | "deadline_passed";

/**
 * A party cancelling or disputing, judged with what the trade's row doesn't
 * hold: whether its deadline has passed the drain's watermark, and whether a
 * token has reached its receiver before the drain recorded it. A trade that
 * moved on is refused first, then one past its deadline, then a cancel once
 * anything has started.
 */
export function partyAction(
  trade: TradeState,
  event: Extract<TradeEvent, { type: "cancel" | "dispute" }>,
  facts: { deadlinePassed: boolean; arrived: boolean },
): { ok: true; trade: TradeState } | { ok: false; reason: PartyActionRefusal } {
  const result = transition(trade, event);
  if (!result.ok && result.reason === "wrong_status") return result;
  if (facts.deadlinePassed) return { ok: false, reason: "deadline_passed" };
  if (result.ok && event.type === "cancel" && facts.arrived) {
    return refuse("already_started");
  }
  return result;
}

type EventOf<TType extends TradeEvent["type"]> = Extract<
  TradeEvent,
  { type: TType }
>;

/**
 * Everything that ends or accepts a pending direct offer. The recipient
 * answers it, the sender withdraws it, and the timers and drain expire it or
 * turn it stale.
 */
function answerOffer(
  { status, items }: TradeState,
  event: EventOf<
    "accept" | "decline" | "counter" | "withdraw" | "expire" | "go_stale"
  >,
): TransitionResult {
  if (status !== "pending") return refuse("wrong_status");

  switch (event.type) {
    case "accept":
    case "decline":
    case "counter": {
      if (event.by !== "to") return refuse("wrong_party");
      const next = {
        accept: "accepted",
        decline: "declined",
        counter: "countered",
      } as const satisfies Record<typeof event.type, TradeStatus>;
      return { ok: true, trade: { status: next[event.type], items } };
    }
    case "withdraw":
      if (event.by !== "from") return refuse("wrong_party");
      return { ok: true, trade: { status: "withdrawn", items } };
    case "expire":
      return { ok: true, trade: { status: "expired", items } };
    case "go_stale":
      return { ok: true, trade: { status: "stale", items } };
  }
}

/**
 * A token arriving, a payment marked paid, or a payment confirmed. Marking
 * paid is frozen while disputed; the other two are still recorded.
 */
function updateItem(
  { status, items }: TradeState,
  event: EventOf<"transfer" | "mark_paid" | "confirm_payment">,
): TransitionResult {
  if (
    status !== "accepted" &&
    (status !== "disputed" || event.type === "mark_paid")
  ) {
    return refuse("wrong_status");
  }
  // plain indexing, since `at` would wrap a negative index to the last item
  const item = items[event.item];

  switch (event.type) {
    case "transfer":
      if (item?.kind !== "objekt") return refuse("no_such_item");
      if (item.transferred) return refuse("already_done");
      return settle(
        status,
        items.with(event.item, { ...item, transferred: true }),
      );
    case "mark_paid":
      if (item?.kind !== "payment") return refuse("no_such_item");
      if (event.by !== item.sender) return refuse("wrong_party");
      if (item.markedPaid) return refuse("already_done");
      return settle(
        status,
        items.with(event.item, { ...item, markedPaid: true }),
      );
    case "confirm_payment":
      if (item?.kind !== "payment") return refuse("no_such_item");
      if (event.by === item.sender) return refuse("wrong_party");
      if (item.confirmed) return refuse("already_done");
      return settle(
        status,
        items.with(event.item, { ...item, confirmed: true }),
      );
  }
}

/**
 * The ways out of an accepted trade before it completes: a party cancels
 * while nothing has started, a party disputes, or the deadline passes.
 */
function endEarly(
  { status, items }: TradeState,
  event: EventOf<"cancel" | "dispute" | "time_out">,
): TransitionResult {
  if (status !== "accepted") return refuse("wrong_status");

  switch (event.type) {
    case "cancel":
      if (items.some(isStarted)) return refuse("already_started");
      return {
        ok: true,
        trade: { status: "cancelled", cancelledBy: event.by, items },
      };
    case "dispute":
      return { ok: true, trade: { status: "disputed", items } };
    case "time_out": {
      const [first, ...rest] = owingSides(items);
      /**
       * Nobody owes anything, only a payment's confirmation is missing: the
       * receiver had until the deadline to say it never arrived.
       */
      if (first === undefined) {
        return { ok: true, trade: { status: "completed", items } };
      }
      return {
        ok: true,
        trade: { status: "timed_out", abandonedBy: [first, ...rest], items },
      };
    }
  }
}

/**
 * Staff complete or extend a disputed trade, and may cancel any live one.
 * An extend settles like a transfer, so a trade whose items all arrived
 * while disputed completes rather than waiting for its new deadline.
 */
function resolveAsStaff(
  { status, items }: TradeState,
  event: EventOf<"staff_complete" | "staff_cancel" | "staff_extend">,
): TransitionResult {
  switch (event.type) {
    case "staff_complete":
      if (status !== "disputed") return refuse("wrong_status");
      return { ok: true, trade: { status: "completed", items } };
    case "staff_cancel":
      if (status !== "accepted" && status !== "disputed") {
        return refuse("wrong_status");
      }
      return {
        ok: true,
        trade: { status: "cancelled", cancelledBy: "staff", items },
      };
    case "staff_extend":
      if (status !== "disputed") return refuse("wrong_status");
      return settle("accepted", items);
  }
}

/**
 * An accepted trade completes once everything is done. A disputed one keeps
 * its status, since staff resolve it.
 */
function settle(
  status: "accepted" | "disputed",
  items: readonly TradeItemState[],
): TransitionResult {
  return {
    ok: true,
    trade: {
      status:
        status === "accepted" && items.every(isDone) ? "completed" : status,
      items,
    },
  };
}

function isStarted(item: TradeItemState) {
  return item.kind === "objekt"
    ? item.transferred
    : item.markedPaid || item.confirmed;
}

function isDone(item: TradeItemState) {
  return item.kind === "objekt" ? item.transferred : item.confirmed;
}

/**
 * The sides with a token that hasn't arrived or a payment they haven't
 * marked paid, `from` first.
 */
export function owingSides(items: readonly TradeItemState[]): TradeSide[] {
  const owes = (side: TradeSide) =>
    items.some(
      (item) =>
        item.sender === side &&
        (item.kind === "objekt" ? !item.transferred : !item.markedPaid),
    );
  return (["from", "to"] as const).filter(owes);
}

export type ListingEvent =
  // a trade was created from the listing
  | "claim"
  // the claim ended with the tokens still with the poster
  | "reopen"
  // the claim's trade completed
  | "fill"
  | "withdraw"
  // an offered token left the poster or turned untransferable
  | "break"
  // staff removed it, or its poster was banned
  | "remove"
  // the claim timed out with the poster marked abandoned
  | "abandon";

/**
 * Which statuses each listing event leaves from, and where it goes. A
 * claimed listing doesn't check its tokens itself; its trade does, and the
 * listing follows the trade's outcome.
 */
const listingTransitions = {
  claim: { from: ["open"], to: "claimed" },
  reopen: { from: ["claimed"], to: "open" },
  fill: { from: ["claimed"], to: "filled" },
  withdraw: { from: ["open"], to: "withdrawn" },
  break: { from: ["open", "claimed"], to: "broken" },
  remove: { from: ["open", "claimed"], to: "removed" },
  abandon: { from: ["claimed"], to: "abandoned" },
} as const satisfies Record<
  ListingEvent,
  { from: readonly ListingStatus[]; to: ListingStatus }
>;

export type ListingTransitionResult =
  | { ok: true; status: ListingStatus }
  | { ok: false; reason: "wrong_status" };

export function transitionListing(
  status: ListingStatus,
  event: ListingEvent,
): ListingTransitionResult {
  const { from, to } = listingTransitions[event];
  return from.some((allowed) => allowed === status)
    ? { ok: true, status: to }
    : { ok: false, reason: "wrong_status" };
}

/**
 * The statuses an event leaves from and the one it moves to, for guarded
 * updates that check the status in SQL.
 */
export function listingTransition(event: ListingEvent): {
  from: readonly ListingStatus[];
  to: ListingStatus;
} {
  return listingTransitions[event];
}

/**
 * What happens to a claimed listing when its trade ends. A completed trade
 * fills it. Otherwise a banned poster's listing is removed, a poster marked
 * abandoned loses it, and anything else releases it back to the poster: the
 * caller reopens it if the poster can still offer every token, else breaks
 * it. Only a release depends on the poster's holdings, so callers read them
 * only then. Live trades leave it alone.
 */
export function listingEventAfter(
  trade: TradeState,
  poster: { banned: boolean },
): ListingEvent | "release" | undefined {
  switch (trade.status) {
    case "completed":
      return "fill";
    case "cancelled":
      return poster.banned ? "remove" : "release";
    case "timed_out":
      if (poster.banned) return "remove";
      return trade.abandonedBy.includes("from") ? "abandon" : "release";
    default:
      return undefined;
  }
}

/**
 * The columns a trade's row takes when it ends in this state.
 */
export function endedTradeColumns(trade: TradeState) {
  return {
    status: trade.status,
    cancelledBy: trade.status === "cancelled" ? trade.cancelledBy : null,
    abandonedBy: trade.status === "timed_out" ? trade.abandonedBy : null,
  };
}

/**
 * The listings a trade's items came from, each with the tokens it offered,
 * which the listing's outcome applies to when the trade ends.
 */
export function tradeListings(
  items: readonly Pick<TradeOfferItem, "listingId" | "tokenId">[],
): Map<string, number[]> {
  const offered = Map.groupBy(
    items.flatMap(({ listingId, tokenId }) =>
      listingId === null || tokenId === null ? [] : [{ listingId, tokenId }],
    ),
    (item) => item.listingId,
  );
  return new Map(
    [...offered].map(([listingId, tokens]) => [
      listingId,
      tokens.map((token) => token.tokenId),
    ]),
  );
}

/**
 * Read a trade and its items, in id order, into the state transitions take.
 * Throws on a listing or on a row the table's checks forbid.
 */
export function tradeState(
  row: Pick<TradeOffer, "status" | "cancelledBy" | "abandonedBy">,
  rows: readonly Pick<
    TradeOfferItem,
    "kind" | "sender" | "transferredAt" | "markedPaidAt" | "confirmedAt"
  >[],
): TradeState {
  const items = rows.map((item): TradeItemState =>
    item.kind === "objekt"
      ? {
          kind: "objekt",
          sender: item.sender,
          transferred: item.transferredAt !== null,
        }
      : {
          kind: "payment",
          sender: item.sender,
          markedPaid: item.markedPaidAt !== null,
          confirmed: item.confirmedAt !== null,
        },
  );

  switch (row.status) {
    case "cancelled":
      if (row.cancelledBy === null) {
        throw new Error("cancelled trade without cancelled_by");
      }
      return { status: row.status, cancelledBy: row.cancelledBy, items };
    case "timed_out": {
      const [first, ...rest] = row.abandonedBy ?? [];
      if (first === undefined) {
        throw new Error("timed out trade without abandoned_by");
      }
      return { status: row.status, abandonedBy: [first, ...rest], items };
    }
    case "pending":
    case "accepted":
    case "disputed":
    case "completed":
    case "declined":
    case "withdrawn":
    case "countered":
    case "expired":
    case "stale":
      return { status: row.status, items };
    case "open":
    case "claimed":
    case "filled":
    case "broken":
    case "removed":
    case "abandoned":
      throw new Error(`${row.status} is a listing status`);
  }
}
