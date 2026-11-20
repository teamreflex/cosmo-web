import {
  type ListingOfferMode,
  type ListingStatus,
  type OpenTradeStatus,
  openTradeStatuses,
  type TradeCanceller,
  type TradeOffer,
  type TradeOfferItem,
  type TradeSide,
  type TradeStatus,
  type TradeWantKind,
} from "@apollo/database/web/types";
import type { ListingPayment, TradePayment } from "./payment";

export type TradeItemState =
  | { kind: "objekt"; sender: TradeSide; transferred: boolean }
  | { kind: "payment"; sender: TradeSide; confirmed: boolean };

/**
 * A trade's status and what each of its items has done, which is all a
 * transition needs. A pending offer is a direct offer or a counter, which
 * `from` proposes, or an offer on a listing, which its claimer `to`
 * proposes (tradeState() holds the two together), and a cancelled trade
 * carries who cancelled it, matching the table's checks.
 */
export type TradeState = (
  | { status: "pending"; proposedBy: TradeSide }
  | { status: "cancelled"; cancelledBy: TradeCanceller }
  | { status: Exclude<TradeStatus, "pending" | "cancelled"> }
) & { items: readonly TradeItemState[] };

/**
 * Party events carry the side acting. Item events name the item by its index
 * in `items`. The rest come from the drain, the timers or staff.
 */
export type TradeEvent =
  // the side that didn't propose a pending offer answers it
  | { type: "accept"; by: TradeSide }
  | { type: "decline"; by: TradeSide }
  | { type: "counter"; by: TradeSide }
  // the proposer takes back a pending offer
  | { type: "withdraw"; by: TradeSide }
  // the drain saw a token reach its receiver
  | { type: "transfer"; item: number }
  // the payment's recipient says it arrived
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
  // a token arrived or a payment was confirmed, so cancelling needs a dispute
  | "already_started"
  // the side cancelling is owed a payment not yet confirmed, so only a dispute or the deadline ends it
  | "payment_due"
  // the item already did what the event says
  | "already_done"
  // the item doesn't exist or is the wrong kind for the event
  | "no_such_item"
  // an offer on a listing is accepted or declined, never countered
  | "listing_offer";

export type TransitionResult =
  { ok: true; trade: TradeState } | { ok: false; reason: TransitionRefusal };

const refuse = (reason: TransitionRefusal): TransitionResult => ({
  ok: false,
  reason,
});

/**
 * Move a trade through its lifecycle, or say why the event can't happen.
 *
 * An offer starts pending: the side that didn't propose it accepts, declines
 * or counters it, unless it offers on a listing, which can't be countered,
 * and the proposer may withdraw it. A listing claim starts accepted. Once
 * accepted, either party may cancel only while nothing has been sent or
 * confirmed; after that, a dispute is the only way out. A dispute freezes
 * the deadline and cancelling. Transfers and confirmations are still
 * recorded while disputed, but only staff complete, cancel or extend a
 * disputed trade. An accepted trade completes once every token has arrived
 * and every payment is confirmed, which an extend checks too.
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
 * A party cancelling, disputing or confirming a payment it received, judged
 * with what the trade's row doesn't hold: whether its deadline has passed
 * the drain's watermark, and whether a token has reached its receiver
 * before the drain recorded it. A trade that moved on is refused first,
 * then one past its deadline, then a cancel once anything has started. A
 * disputed trade's clock is stopped, so its caller passes the deadline as
 * not passed.
 */
export function partyAction(
  trade: TradeState,
  event: Extract<
    TradeEvent,
    { type: "cancel" | "dispute" | "confirm_payment" }
  >,
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
 * A party's answer to a pending offer: the side that didn't propose it
 * accepts, declines or counters it, or the proposer withdraws it. An offer on
 * a listing can't be countered.
 */
function answerOffer(
  trade: TradeState,
  event: EventOf<"accept" | "decline" | "counter" | "withdraw">,
): TransitionResult {
  const { from, to } = offerTransition(event.type);
  if (trade.status !== from) return refuse("wrong_status");
  if (
    event.by !==
    (event.type === "withdraw" ? trade.proposedBy : otherSide(trade.proposedBy))
  ) {
    return refuse("wrong_party");
  }
  // only an offer on a listing is proposed by its claimer
  if (event.type === "counter" && trade.proposedBy === "to") {
    return refuse("listing_offer");
  }
  return { ok: true, trade: { status: to, items: trade.items } };
}

/**
 * A token arriving, or a payment's recipient confirming it arrived. Both
 * are still recorded while disputed.
 */
function updateItem(
  { status, items }: TradeState,
  event: EventOf<"transfer" | "confirm_payment">,
): TransitionResult {
  if (status !== "accepted" && status !== "disputed") {
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
 * while nothing has started and they aren't owed an unconfirmed payment,
 * a party disputes, or the deadline passes,
 * which times it out while nothing has started and otherwise disputes it.
 */
function endEarly(
  { status, items }: TradeState,
  event: EventOf<"cancel" | "dispute" | "time_out">,
): TransitionResult {
  if (status !== "accepted") return refuse("wrong_status");

  switch (event.type) {
    case "cancel":
      /**
       * Apollo never sees money move, so a recipient may hold the payment
       * without having confirmed it: cancelling could leave the payer out
       * of pocket. Only the payer may cancel; the recipient disputes.
       */
      if (
        items.some(
          (item) =>
            item.kind === "payment" &&
            item.sender !== event.by &&
            !item.confirmed,
        )
      ) {
        return refuse("payment_due");
      }
      if (items.some(isDone)) return refuse("already_started");
      return {
        ok: true,
        trade: { status: "cancelled", cancelledBy: event.by, items },
      };
    case "dispute":
      return { ok: true, trade: { status: "disputed", items } };
    case "time_out":
      /**
       * Something arrived while something is still owed, so a side may be
       * out of pocket: staff decide it, rather than a time out handing the
       * listing back over an objekt already sent.
       */
      if (items.some(isDone)) {
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

/**
 * Whether a token arrived or a payment's recipient confirmed it, which is
 * also what counts as started: a payment is owed until it is confirmed.
 */
export function isDone(item: TradeItemState) {
  return item.kind === "objekt" ? item.transferred : item.confirmed;
}

/**
 * The sides with a token that hasn't arrived or a payment its recipient
 * hasn't confirmed, `from` first.
 */
function owingSides(items: readonly TradeItemState[]): TradeSide[] {
  const owes = (side: TradeSide) =>
    items.some((item) => item.sender === side && !isDone(item));
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
 * The user who proposed a trade that started as an offer, or null once
 * their account is gone. Throws on a row without a proposer, which only a
 * claim or a listing is (trade_offers_proposed_chk), so callers pass the
 * offers they read as pending.
 */
export function proposerId(
  row: Pick<TradeOffer, "id" | "fromUserId" | "toUserId" | "proposedBy">,
) {
  if (row.proposedBy === null) {
    throw new Error(`offer ${row.id} has no proposed_by`);
  }
  return row.proposedBy === "from" ? row.fromUserId : row.toUserId;
}

/**
 * How a listing's claims are counted: a pool listing gives `unitSize` of
 * its pool objekts per unit, and a buy listing, which offers no objekts,
 * pays for up to `maxUnits` units in all.
 */
export type ListingUnits =
  { kind: "pool"; unitSize: number } | { kind: "buy"; maxUnits: number };

/**
 * A listing's units (ListingUnits) from its row. Throws on a row with
 * neither or both, which only a trade is (trade_offers_unit_size_chk), so
 * callers pass listings.
 */
export function listingUnits(
  row: Pick<TradeOffer, "id" | "unitSize" | "maxUnits">,
): ListingUnits {
  if (row.unitSize !== null && row.maxUnits === null) {
    return { kind: "pool", unitSize: row.unitSize };
  }
  if (row.unitSize === null && row.maxUnits !== null) {
    return { kind: "buy", maxUnits: row.maxUnits };
  }
  throw new Error(`listing ${row.id} has no unit`);
}

/**
 * Why an edit can't give a listing the units `next`, or null when it can.
 * A listing with a live or completed trade keeps its kind, pool or buy
 * (`kind_fixed`), because those trades decide how it closes: a completed
 * buy trade would make a pool that runs dry read as filled. A buy listing
 * keeps at least the units its live and completed trades fill (`taken`),
 * and more than the completed ones alone, since one whose completed trades
 * fill it has nothing left to buy and would never close (`units_taken`).
 */
export function editUnitsRefusal(
  next: ListingUnits,
  held: {
    units: ListingUnits;
    live: boolean;
    completed: boolean;
    taken: number;
    completedUnits: number;
  },
): "kind_fixed" | "units_taken" | null {
  if ((held.live || held.completed) && held.units.kind !== next.kind) {
    return "kind_fixed";
  }
  return next.kind === "buy" &&
    (next.maxUnits < held.taken || next.maxUnits <= held.completedUnits)
    ? "units_taken"
    : null;
}

/**
 * Whether the side has to act: the side that didn't propose a pending offer
 * answers it, and on an accepted trade a side sends a token it still owes or
 * confirms a payment it is owed. Paying happens outside Apollo, so an unpaid
 * payment asks nothing of its sender. Once an accepted trade's deadline has
 * passed the drain's watermark neither can count, so nothing more is asked.
 * Nothing else needs anyone.
 */
export function needsYou(
  state: TradeState,
  side: TradeSide,
  facts: { deadlinePassed: boolean },
) {
  switch (state.status) {
    case "pending":
      return side !== state.proposedBy;
    case "accepted":
      return (
        !facts.deadlinePassed &&
        state.items.some((item) =>
          item.kind === "objekt"
            ? item.sender === side && !item.transferred
            : item.sender !== side && !item.confirmed,
        )
      );
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
  // the pool ran short of a unit after one of its trades completed
  | "fill"
  | "withdraw"
  // the pool ran short of a unit with none of its trades completed
  | "break"
  // staff removed it, or its poster was banned
  | "remove";

/**
 * Which statuses each listing event leaves from, and where it goes. Only an
 * open listing moves: claims start trades beside it rather than moving it.
 */
const listingTransitions = {
  fill: { from: ["open"], to: "filled" },
  withdraw: { from: ["open"], to: "withdrawn" },
  break: { from: ["open"], to: "broken" },
  remove: { from: ["open"], to: "removed" },
} as const satisfies Record<
  ListingEvent,
  { from: readonly ListingStatus[]; to: ListingStatus }
>;

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
 * How an open listing closes, or null while it stays open. Nothing closes
 * while one of its trades is live, since that trade's outcome decides how
 * it ends. A pool listing closes once its pool can't make a unit: filled
 * when any of its trades completed, else broken. A live trade's objekts
 * count toward the pool until it completes, and one that left the poster on
 * its way to the claimer has already been dropped. A buy listing has no
 * pool, so it never breaks, and fills once its completed trades' units
 * reach its most units. Applied after a trade ends and after the drain
 * drops departed objekts.
 */
export function listingClosing(listing: {
  units: ListingUnits;
  pool: number;
  live: boolean;
  completed: boolean;
  completedUnits: number;
}): Extract<ListingEvent, "fill" | "break"> | null {
  if (listing.live) return null;
  if (listing.units.kind === "buy") {
    return listing.completedUnits >= listing.units.maxUnits ? "fill" : null;
  }
  if (listing.pool >= listing.units.unitSize) return null;
  return listing.completed ? "fill" : "break";
}

/**
 * How a listing takes claims and offers:
 * - `claim`: every claim starts a trade at once;
 * - `either`: a claim at the asking price starts a trade at once, and an
 *   offer on another amount waits for the poster;
 * - `offer`: every claim is an offer the poster accepts or declines. Any
 *   range row makes a listing one, since a range matches many serials and
 *   only the poster knows which they meant, and so does a payment with no
 *   asking price. Exact and "any of" rows name their collections.
 */
export type ListingAcceptance = "claim" | "either" | "offer";

export function listingAcceptance(
  wants: readonly { kind: TradeWantKind }[],
  mode: ListingOfferMode | null,
): ListingAcceptance {
  if (mode === "offer_only" || wants.some((want) => want.kind === "range")) {
    return "offer";
  }
  return mode === "price_or_offer" ? "either" : "claim";
}

/**
 * What a claim on a listing starts: a trade at once (`claim`) or an offer,
 * with the payment it records for each unit, sent by the listing's payment
 * side, or null when the listing has no payment.
 */
export type ClaimTerms = {
  kind: "claim" | "offer";
  payment: TradePayment | null;
};

/**
 * What a claim on a listing starts (ClaimTerms), from the amount per unit
 * the claimer proposed, if any. An amount equal to the asking price of a
 * listing open to offers accepts that price, so it claims at once like no
 * amount does. Null when the listing can't take what was sent: an amount
 * on a listing with no payment or a fixed price, or none on a listing
 * with no asking price.
 */
export function claimTerms(
  listing: {
    wants: readonly { kind: TradeWantKind }[];
    payment: ListingPayment | null;
  },
  proposed: number | undefined,
): ClaimTerms | null {
  const kind = listing.wants.some((want) => want.kind === "range")
    ? "offer"
    : "claim";
  const { payment } = listing;
  if (payment === null) {
    return proposed === undefined ? { kind, payment: null } : null;
  }
  const at = (amount: number): TradePayment => ({
    side: payment.side,
    currency: payment.currency,
    amount,
  });
  switch (payment.mode) {
    case "price_only":
      return proposed === undefined
        ? { kind, payment: at(payment.amount) }
        : null;
    case "price_or_offer":
      return proposed === undefined || proposed === payment.amount
        ? { kind, payment: at(payment.amount) }
        : { kind: "offer", payment: at(proposed) };
    case "offer_only":
      return proposed === undefined
        ? null
        : { kind: "offer", payment: at(proposed) };
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
 * The listings a trade's items came from, each with the tokens it took from
 * that listing's pool, which a completion removes from the pool. A trade
 * from a buy listing finds it through the poster's payment item and takes
 * no tokens.
 */
export function tradeListings(
  items: readonly Pick<TradeOfferItem, "listingId" | "tokenId">[],
): Map<string, number[]> {
  const listings = new Map<string, number[]>();
  for (const { listingId, tokenId } of items) {
    if (listingId === null) continue;
    const tokens = listings.get(listingId) ?? [];
    if (tokenId !== null) tokens.push(tokenId);
    listings.set(listingId, tokens);
  }
  return listings;
}

/**
 * The listing a trade came from, a claim or an offer on it, which every
 * item from its pool names, or null for a direct offer.
 */
export function tradeListingId(
  items: readonly Pick<TradeOfferItem, "listingId">[],
) {
  return items.find((item) => item.listingId !== null)?.listingId ?? null;
}

/**
 * Read a trade and its items, in id order, into the state transitions take.
 * A pending offer offers on a listing when any of its items came from one.
 * Throws on a listing, on a row the table's checks forbid, and on a pending
 * offer that is neither a direct offer `from` proposed nor an offer on a
 * listing its claimer `to` proposed.
 */
export function tradeState(
  row: Pick<TradeOffer, "status" | "cancelledBy" | "proposedBy">,
  rows: readonly Pick<
    TradeOfferItem,
    "kind" | "sender" | "listingId" | "transferredAt" | "confirmedAt"
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
          confirmed: item.confirmedAt !== null,
        },
  );

  switch (row.status) {
    case "cancelled":
      if (row.cancelledBy === null) {
        throw new Error("cancelled trade without cancelled_by");
      }
      return { status: row.status, cancelledBy: row.cancelledBy, items };
    case "pending": {
      const fromListing = tradeListingId(rows) !== null;
      if (
        (row.proposedBy === "from" && !fromListing) ||
        (row.proposedBy === "to" && fromListing)
      ) {
        return { status: row.status, proposedBy: row.proposedBy, items };
      }
      throw new Error(
        `pending trade proposed by ${row.proposedBy ?? "nobody"} ${fromListing ? "on" : "off"} a listing`,
      );
    }
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
