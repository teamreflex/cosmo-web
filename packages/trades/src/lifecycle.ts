import type {
  ListingStatus,
  TradeCanceller,
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
  // a pending offer's serial moved
  | { type: "go_stale" }
  // the drain saw a serial reach its receiver
  | { type: "transfer"; item: number }
  | { type: "mark_paid"; item: number; by: TradeSide }
  | { type: "confirm_payment"; item: number; by: TradeSide }
  | { type: "cancel"; by: TradeSide }
  | { type: "dispute"; by: TradeSide }
  // the deadline passed the drain's watermark
  | { type: "time_out" }
  | { type: "staff_complete" }
  | { type: "staff_cancel" }
  // staff gave a disputed trade a new deadline, which unfreezes it
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
 * disputed, but only staff complete or cancel a disputed trade. An accepted
 * trade completes once every serial has arrived and every payment is
 * confirmed.
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
 * A serial arriving, a payment marked paid, or a payment confirmed. Marking
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
  const item = items.at(event.item);

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
      return { ok: true, trade: { status: "accepted", items } };
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
 * The sides with a serial that hasn't arrived or a payment they haven't
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
  // the claim ended with the serials still with the poster
  | "reopen"
  // the claim's trade completed
  | "fill"
  | "withdraw"
  | "expire"
  // an offered serial left the poster or turned untransferable
  | "break"
  // staff removed it, or banned the poster
  | "remove"
  // the claim timed out with the poster marked abandoned
  | "abandon";

/**
 * Which statuses each listing event leaves from, and where it goes. A
 * claimed listing doesn't check its serials itself; its trade does, and the
 * listing follows the trade's outcome.
 */
const listingTransitions = {
  claim: { from: ["open"], to: "claimed" },
  reopen: { from: ["claimed"], to: "open" },
  fill: { from: ["claimed"], to: "filled" },
  withdraw: { from: ["open"], to: "withdrawn" },
  expire: { from: ["open"], to: "expired" },
  break: { from: ["open", "claimed"], to: "broken" },
  remove: { from: ["open"], to: "removed" },
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
