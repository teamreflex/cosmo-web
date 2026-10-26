import {
  type ListingStatus,
  type OpenTradeStatus,
  openTradeStatuses,
  type TradeCanceller,
  type TradeOffer,
  type TradeOfferItem,
  type TradeSide,
  type TradeStatus,
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
 * transition needs. A cancelled trade carries who cancelled it, matching the
 * table's check.
 */
export type TradeState = (
  | { status: "cancelled"; cancelledBy: TradeCanceller }
  | { status: Exclude<TradeStatus, "cancelled"> }
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
  { ok: true; trade: TradeState } | { ok: false; reason: TransitionRefusal };

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
 * A party's answer to a pending direct offer: the recipient accepts,
 * declines or counters it, or the sender withdraws it.
 */
function answerOffer(
  { status, items }: TradeState,
  event: EventOf<"accept" | "decline" | "counter" | "withdraw">,
): TransitionResult {
  const { from, to } = offerTransition(event.type);
  if (status !== from) return refuse("wrong_status");
  if (event.by !== (event.type === "withdraw" ? "from" : "to")) {
    return refuse("wrong_party");
  }
  return { ok: true, trade: { status: to, items } };
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
 * while nothing has started, a party disputes, or the deadline passes,
 * which times it out while nothing has started and otherwise disputes it.
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
    case "time_out":
      /**
       * Nobody owes anything, only a payment's confirmation is missing: the
       * receiver had until the deadline to say it never arrived.
       */
      if (owingSides(items).length === 0) {
        return { ok: true, trade: { status: "completed", items } };
      }
      /**
       * Something arrived while something is still owed, so a side may be
       * out of pocket: staff decide it, rather than a time out handing the
       * listing back over an objekt already sent.
       */
      if (items.some(isStarted)) {
        return { ok: true, trade: { status: "disputed", items } };
      }
      return { ok: true, trade: { status: "timed_out", items } };
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

// whether a token arrived or a payment was confirmed
export function isDone(item: TradeItemState) {
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

/**
 * The side that sent everything it owed while the other side still owes,
 * which a dispute at the deadline names as its reporter. Null when both
 * sides still owe something, or neither does.
 */
export function waitingSide(
  items: readonly TradeItemState[],
): TradeSide | null {
  const [owing, ...rest] = owingSides(items);
  return owing !== undefined && rest.length === 0 ? otherSide(owing) : null;
}

// the trade's other side, who receives what this side sends
export function otherSide(side: TradeSide): TradeSide {
  return side === "from" ? "to" : "from";
}

/**
 * Whether the side has to act: the recipient of a pending offer answers it,
 * and a side still owing something on an accepted trade sends or pays. Once
 * an accepted trade's deadline has passed the drain's watermark a transfer
 * can't count, so nothing more is asked. Nothing else needs anyone.
 */
export function needsYou(
  state: TradeState,
  side: TradeSide,
  facts: { deadlinePassed: boolean },
) {
  switch (state.status) {
    case "pending":
      return side === "to";
    case "accepted":
      return !facts.deadlinePassed && owingSides(state.items).includes(side);
    default:
      return false;
  }
}

// whether a trade is still under way: a pending offer, or a live trade
export function isOpenTrade(status: TradeStatus): status is OpenTradeStatus {
  return openTradeStatuses.some((open) => open === status);
}

export type OfferEvent =
  | "accept"
  | "decline"
  | "counter"
  | "withdraw"
  // nobody answered within the offer's 72 hours
  | "expire"
  // an offered token left its holder or turned untransferable
  | "go_stale";

/**
 * Which status each offer event leaves from, always pending, and where it
 * goes. The parties' answers go through transition(), which checks who
 * acts; the timers, the drain, a ban and an account deletion end offers in
 * guarded updates.
 */
const offerTransitions = {
  accept: { from: "pending", to: "accepted" },
  decline: { from: "pending", to: "declined" },
  counter: { from: "pending", to: "countered" },
  withdraw: { from: "pending", to: "withdrawn" },
  expire: { from: "pending", to: "expired" },
  go_stale: { from: "pending", to: "stale" },
} as const satisfies Record<OfferEvent, { from: TradeStatus; to: TradeStatus }>;

/**
 * The status an offer event leaves from and the one it moves to, for
 * guarded updates that check the status in SQL.
 */
export function offerTransition(event: OfferEvent) {
  return offerTransitions[event];
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
  // the claim's trade timed out with nothing sent
  | "time_out";

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
  time_out: { from: ["claimed"], to: "timed_out" },
} as const satisfies Record<
  ListingEvent,
  { from: readonly ListingStatus[]; to: ListingStatus }
>;

export type ListingTransitionResult =
  { ok: true; status: ListingStatus } | { ok: false; reason: "wrong_status" };

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
 * How a listing closes once objekts leave its pool, or null while the pool
 * still holds a unit: filled when any of its trades completed, else broken.
 * Completion and the drain's dropping of moved objekts both apply it.
 */
export function listingClosing(listing: {
  pool: number;
  unitSize: number;
  completed: boolean;
}): Extract<ListingEvent, "fill" | "break"> | null {
  if (listing.pool >= listing.unitSize) return null;
  return listing.completed ? "fill" : "break";
}

/**
 * What happens to a claimed listing when its trade ends. A completed trade
 * fills it. Otherwise a banned poster's listing is removed, a timed-out
 * trade closes it, since neither side acted in time, and a cancelled one
 * releases it back to the poster: the caller reopens it if the poster still
 * holds every token, else breaks it. Only a release depends on the poster's holdings, so callers read them
 * only then. Live trades leave it alone.
 */
export function listingEventAfter(
  trade: TradeState,
  poster: { banned: boolean },
): Exclude<ListingEvent, "reopen"> | "release" | undefined {
  switch (trade.status) {
    case "completed":
      return "fill";
    case "cancelled":
      return poster.banned ? "remove" : "release";
    case "timed_out":
      return poster.banned ? "remove" : "time_out";
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
  row: Pick<TradeOffer, "status" | "cancelledBy">,
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
    case "pending":
    case "accepted":
    case "disputed":
    case "completed":
    case "timed_out":
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
      throw new Error(`${row.status} is a listing status`);
  }
}
