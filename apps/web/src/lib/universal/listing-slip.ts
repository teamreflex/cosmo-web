import type { ListingPayment } from "@apollo/trades/payment";
import type { ObjektAttributes, RangeFilter } from "@apollo/trades/range";
import type { Objekt } from "./objekt-conversion";
import type {
  ListingFeedItem,
  ListingFeedWant,
  ListingOption,
  ListingSlip,
} from "./trade-listings";

/**
 * How a slip lays out its chips: a feed row's `compact` lines, which name
 * two collections and count the rest, sum up a range's several seasons or
 * classes and stop after a few lines, or the preview's `full` lines, which
 * name everything.
 */
export type SlipMode = "compact" | "full";

/**
 * A card in a slip's fan: an objekt's picture, a range's placeholder or a
 * payment's currency tile.
 */
export type SlipCard =
  | { kind: "objekt"; key: string; collection: Objekt.Collection | null }
  | { kind: "range"; key: string; ranges: readonly RangeFilter[] }
  | { kind: "payment"; key: string; currency: string };

/**
 * One chip on a slip line. A collection chip counts the `copies` of it a
 * side offers and carries its serial when it stands for one token. A range
 * reads as its artist, member, season, number, class and on/offline chips,
 * a column of several values summed up as a count (`values`) in compact
 * lines. `more` counts the collections or members a compact line left
 * out, and `lines` the lines a compact side left out after its last.
 */
export type SlipChip =
  | {
      kind: "collection";
      key: string;
      attributes: ObjektAttributes;
      collection: Objekt.Collection | null;
      serial: number | null;
      copies: number;
    }
  | { kind: "artist"; key: string; artist: string }
  | { kind: "member"; key: string; member: string }
  | { kind: "seasons"; key: string; seasons: readonly string[] }
  | { kind: "value"; key: string; column: ValueColumn; value: string }
  | { kind: "values"; key: string; column: SummedColumn; count: number }
  | { kind: "payment"; key: string; payment: ListingPayment; perUnit: boolean }
  | { kind: "more"; key: string; count: number }
  | { kind: "lines"; key: string; count: number };

type ValueColumn = "collectionNo" | "class" | "onOffline";
type SummedColumn = "collectionNo" | "class";

/**
 * One line of a slip side: what goes in its gutter, `and` ("+") before a
 * further want or payment, `or` before a further range of one want, or
 * the number of the option it starts; its count, on a want's first line;
 * and its chips.
 */
export type SlipLine = {
  key: string;
  gutter: { kind: "and" | "or" } | { kind: "option"; number: number } | null;
  count: number | null;
  chips: SlipChip[];
};

// how many collections or members a compact line names before counting the rest
const NAMED = 2;
// how many lines a compact side shows
const COMPACT_LINES = 3;
// most cards in a fan
const FAN_CARDS = 3;

type CollectionShown = {
  attributes: ObjektAttributes;
  collection: Objekt.Collection | null;
  serial: number | null;
};

/**
 * Collections as chips. Compact lines fold copies of one collection into a
 * chip, keep a serial only for a lone token, and name two collections
 * before a `more` chip; full lines give every token its own chip.
 */
export function collectionChips(
  key: string,
  shown: readonly CollectionShown[],
  mode: SlipMode,
): SlipChip[] {
  if (mode === "full") {
    return shown.map((each, index) => ({
      kind: "collection",
      key: `${key}:${index}`,
      ...each,
      copies: 1,
    }));
  }
  const bySlug = new Map<string, CollectionShown & { copies: number }>();
  for (const each of shown) {
    const seen = bySlug.get(each.attributes.slug);
    bySlug.set(
      each.attributes.slug,
      seen === undefined
        ? { ...each, copies: 1 }
        : { ...seen, copies: seen.copies + 1 },
    );
  }
  const distinct = [...bySlug.values()].map((each, index): SlipChip => ({
    kind: "collection",
    key: `${key}:${index}`,
    ...each,
    serial: shown.length === 1 ? each.serial : null,
  }));
  return named(key, distinct);
}

// the first chips a compact line names, and a count of the rest
function named(key: string, chips: SlipChip[]): SlipChip[] {
  return chips.length <= NAMED
    ? chips
    : [
        ...chips.slice(0, NAMED),
        { kind: "more", key: `${key}:more`, count: chips.length - NAMED },
      ];
}

/**
 * One range's chips: its artists, members, seasons, collection numbers,
 * classes and on/offline values. Compact lines name two members and sum
 * up several numbers or classes; full lines name every value.
 */
export function rangeChips(
  key: string,
  range: RangeFilter,
  mode: SlipMode,
): SlipChip[] {
  const members = range.member.map((member): SlipChip => ({
    kind: "member",
    key: `${key}:member:${member}`,
    member,
  }));
  const values = (column: SummedColumn, list: readonly string[]): SlipChip[] =>
    mode === "compact" && list.length > 1
      ? [
          {
            kind: "values",
            key: `${key}:${column}`,
            column,
            count: list.length,
          },
        ]
      : list.map((value) => ({
          kind: "value",
          key: `${key}:${column}:${value}`,
          column,
          value,
        }));
  return [
    ...range.artist.map((artist): SlipChip => ({
      kind: "artist",
      key: `${key}:artist:${artist}`,
      artist,
    })),
    ...(mode === "compact" ? named(`${key}:members`, members) : members),
    ...(range.season.length === 0
      ? []
      : mode === "compact"
        ? [seasonsChip(`${key}:seasons`, range.season)]
        : range.season.map((season) =>
            seasonsChip(`${key}:season:${season}`, [season]),
          )),
    ...values("collectionNo", range.collectionNo),
    ...values("class", range.class),
    ...range.on_offline.map((value): SlipChip => ({
      kind: "value",
      key: `${key}:onOffline:${value}`,
      column: "onOffline",
      value,
    })),
  ];
}

function seasonsChip(key: string, seasons: readonly string[]): SlipChip {
  return { kind: "seasons", key, seasons };
}

// a want's lines: one per range of a range row, the count on the first
function wantLines(
  key: string,
  want: ListingFeedWant,
  mode: SlipMode,
): SlipLine[] {
  switch (want.kind) {
    case "exact":
      return [
        {
          key,
          gutter: null,
          count: want.count,
          chips: collectionChips(
            key,
            [
              {
                attributes: want.objekt,
                collection: want.collection,
                serial: null,
              },
            ],
            mode,
          ),
        },
      ];
    case "choice":
      return [
        {
          key,
          gutter: null,
          count: want.count,
          chips: collectionChips(
            key,
            want.options.map(({ collection, ...attributes }) => ({
              attributes,
              collection,
              serial: null,
            })),
            mode,
          ),
        },
      ];
    case "range":
      return want.ranges.map((range, index): SlipLine => ({
        key: `${key}:${index}`,
        gutter: index === 0 ? null : { kind: "or" },
        count: index === 0 ? want.count : null,
        chips: rangeChips(`${key}:${index}`, range, mode),
      }));
  }
}

/**
 * What one option asks for: each want row's lines, a "+" before each row
 * after the first, then the claimer's payment, on its own line after the
 * rows or alone.
 */
export function optionLines(
  key: string,
  option: ListingOption<ListingFeedWant>,
  mode: SlipMode,
): SlipLine[] {
  const rows = option.wants.flatMap((want, index) =>
    wantLines(`${key}:${index}`, want, mode).map((line, position): SlipLine =>
      index > 0 && position === 0 ? { ...line, gutter: { kind: "and" } } : line,
    ),
  );
  if (option.payment?.side !== "to") return rows;
  return [
    ...rows,
    {
      key: `${key}:payment`,
      gutter: rows.length === 0 ? null : { kind: "and" },
      count: null,
      chips: [
        {
          kind: "payment",
          key: `${key}:payment`,
          payment: option.payment,
          perUnit: false,
        },
      ],
    },
  ];
}

/**
 * A feed row's Asking side: its one option's lines, or each option's with
 * its number on its first line, cut to a few lines with what was left out
 * counted on the last one.
 */
export function askingLines(
  options: readonly ListingOption<ListingFeedWant>[],
): SlipLine[] {
  const lines =
    options.length === 1
      ? options.flatMap((option, index) =>
          optionLines(`${index}`, option, "compact"),
        )
      : options.flatMap((option, index) =>
          optionLines(`${index}`, option, "compact").map(
            (line, position): SlipLine =>
              position === 0
                ? { ...line, gutter: { kind: "option", number: index + 1 } }
                : line,
          ),
        );
  return capLines(lines);
}

function capLines(lines: SlipLine[]): SlipLine[] {
  const kept = lines.slice(0, COMPACT_LINES);
  const last = kept.at(-1);
  const hidden = lines.length - kept.length;
  if (last === undefined || hidden === 0) return kept;
  return [
    ...kept.slice(0, -1),
    {
      ...last,
      chips: [
        ...last.chips,
        { kind: "lines", key: `${last.key}:lines`, count: hidden },
      ],
    },
  ];
}

/**
 * The poster's payment on top of their objekts, which prices every option
 * alike, or null without one.
 */
export function posterPayment(slip: Pick<ListingSlip, "options">) {
  const payment = slip.options[0]?.payment;
  return payment?.side === "from" ? payment : null;
}

/**
 * What a listing offers: a buy listing's price for each unit, or its
 * objekts with the poster's payment on its own line after them.
 */
export function offeringLines(
  slip: Pick<ListingSlip, "items" | "options" | "units">,
  mode: SlipMode,
): SlipLine[] {
  const payment = posterPayment(slip);
  if (slip.units.kind === "buy" && payment !== null) {
    return [
      {
        key: "buy",
        gutter: null,
        count: null,
        chips: [{ kind: "payment", key: "buy", payment, perUnit: true }],
      },
    ];
  }
  const objekts = itemLines(slip.items, mode);
  return payment === null
    ? objekts
    : [
        ...objekts,
        {
          key: "payment",
          gutter: objekts.length === 0 ? null : { kind: "and" },
          count: null,
          chips: [{ kind: "payment", key: "payment", payment, perUnit: false }],
        },
      ];
}

/**
 * Tokens as one line of collection chips, or none without any.
 */
export function itemLines(
  items: readonly ListingFeedItem[],
  mode: SlipMode,
): SlipLine[] {
  return items.length === 0
    ? []
    : [
        {
          key: "items",
          gutter: null,
          count: null,
          chips: collectionChips("items", items, mode),
        },
      ];
}

/**
 * The first cards of a trade side's fan: its tokens, or the currency of a
 * side that sends only a payment.
 */
export function tradeSideCards(side: {
  items: readonly ListingFeedItem[];
  payment: { currency: string } | null;
}): SlipCard[] {
  return side.items.length === 0 && side.payment !== null
    ? [paymentCard("payment", side.payment.currency)]
    : itemCards(side.items);
}

function itemCards(items: readonly ListingFeedItem[]): SlipCard[] {
  return items.slice(0, FAN_CARDS).map((item): SlipCard => ({
    kind: "objekt",
    key: `${item.tokenId}`,
    collection: item.collection,
  }));
}

/**
 * The first cards of what a listing offers: its objekts, or a buy
 * listing's currency.
 */
export function offeringCards(
  slip: Pick<ListingSlip, "items" | "options" | "units">,
): SlipCard[] {
  const payment = posterPayment(slip);
  return slip.units.kind === "buy" && payment !== null
    ? [paymentCard("buy", payment.currency)]
    : itemCards(slip.items);
}

function paymentCard(key: string, currency: string): SlipCard {
  return { kind: "payment", key, currency };
}

/**
 * The first cards of what a listing asks for, in posted order across its
 * options: an exact row's collection, each collection of an "any of" row,
 * a range row's placeholder, and the claimer's payment on an option of a
 * payment alone.
 */
export function askingCards(
  options: readonly ListingOption<ListingFeedWant>[],
): SlipCard[] {
  return options
    .flatMap((option, index): SlipCard[] => [
      ...(option.wants.length === 0 && option.payment?.side === "to"
        ? [paymentCard(`${index}:payment`, option.payment.currency)]
        : []),
      ...option.wants.flatMap((want, row): SlipCard[] => {
        const key = `${index}:${row}`;
        switch (want.kind) {
          case "exact":
            return [{ kind: "objekt", key, collection: want.collection }];
          case "choice":
            return want.options.map((choice, position): SlipCard => ({
              kind: "objekt",
              key: `${key}:${position}`,
              collection: choice.collection,
            }));
          case "range":
            return [{ kind: "range", key, ranges: want.ranges }];
        }
      }),
    ])
    .slice(0, FAN_CARDS);
}
