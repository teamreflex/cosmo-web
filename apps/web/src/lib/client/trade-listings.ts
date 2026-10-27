import type { PickerScope } from "@/components/objekt-picker/picker-filters";
import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { artistName, Objekt } from "@/lib/universal/objekt-conversion";
import {
  type ClosedListingState,
  hasRatio,
  type ListingFeedWant,
  type ListingPick,
  type PoolAvailability,
  type PoolStanding,
  type TokenRefusalReason,
  type TradeListing,
  type TradeRatio,
} from "@/lib/universal/trade-listings";
import type { TradePartyName } from "@/lib/universal/trades";
import {
  type ValidArtist,
  validArtists,
  validOnlineTypes,
} from "@apollo/cosmo/types/common";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import {
  rangeSummaryColumns,
  totalWanted,
  toUiArtist,
} from "@apollo/trades/composer";
import { heldTokenRefusal, type TokenFlags } from "@apollo/trades/holdings";
import {
  hasBidiControl,
  type ObjektAttributes,
  type RangeFilter,
} from "@apollo/trades/range";
import { isAddress, shortAddress } from "@apollo/util";

/**
 * The poster as the listing page names them: their COSMO username, else
 * their Apollo username, else "Deleted user".
 */
export function posterName(
  listing: Pick<TradeListing, "poster" | "cosmoUsername">,
) {
  const name = listing.cosmoUsername ?? listing.poster?.username;
  return name === undefined ? m.common_deleted_user() : `@${accountName(name)}`;
}

/**
 * A party as the trade page names them, as posterName() names a poster.
 */
export function partyName(party: TradePartyName) {
  return posterName({ poster: party.user, cosmoUsername: party.cosmoUsername });
}

// a COSMO account without a nickname goes by its address
export function accountName(name: string) {
  return isAddress(name) ? shortAddress(name) : name;
}

/**
 * How many objekts the listing asks for; a payment row asks for none.
 */
export function wantedObjektCount(wants: readonly ListingFeedWant[]) {
  return totalWanted(
    wants.flatMap((want) => (want.kind === "payment" ? [] : [want])),
  );
}

/**
 * An objekt's short name, "Atom02 HeeJin 201Z". Without its collection the
 * number comes from the copied slug.
 */
export function objektName(
  collection: Objekt.Collection | null,
  attributes: ObjektAttributes,
) {
  return `${attributes.season} ${attributes.member} ${collectionNumber(collection, attributes)}`;
}

function collectionNumber(
  collection: Objekt.Collection | null,
  attributes: ObjektAttributes,
) {
  return (
    collection?.collectionNo ??
    attributes.slug.split("-").at(-1)?.toUpperCase() ??
    ""
  );
}

/**
 * Several offered objekts as a feed row names them, with objekts of one
 * season and member under a single name: "Atom01 HeeJin 101Z, 102Z".
 */
export function offeredNames(
  items: readonly {
    collection: Objekt.Collection | null;
    attributes: ObjektAttributes;
  }[],
) {
  const groups = new Map<string, Set<string>>();
  for (const { collection, attributes } of items) {
    const prefix = `${attributes.season} ${attributes.member}`;
    const numbers = groups.get(prefix) ?? new Set();
    groups.set(prefix, numbers.add(collectionNumber(collection, attributes)));
  }
  return [...groups]
    .map(([prefix, numbers]) => `${prefix} ${[...numbers].join(", ")}`)
    .join(", ");
}

/**
 * Several offered objekts as the phone card's subtitle: each season once,
 * then its members, "Atom02 · JinSoul, KimLip, Choerry".
 */
export function offeredMembers(
  items: readonly { attributes: ObjektAttributes }[],
) {
  const seasons = new Map<string, Set<string>>();
  for (const { attributes } of items) {
    const members = seasons.get(attributes.season) ?? new Set();
    seasons.set(attributes.season, members.add(attributes.member));
  }
  return [...seasons]
    .map(([season, members]) => `${season} · ${[...members].join(", ")}`)
    .join(", ");
}

/**
 * A count in the reader's locale, "6,596".
 */
export function formatCount(count: number) {
  return new Intl.NumberFormat(getLocale()).format(count);
}

/**
 * A range row's narrowed values, "Atom02 · ARTMS · First". Several values in
 * one column read "Atom02 / Binary01". Posting refuses bidi controls, and a
 * stored value holding one sits in its own isolate, so it can't reorder the
 * values beside it. A non-breaking space before each "·" keeps it off the
 * start of a wrapped line.
 */
export function rangeLabel(filter: RangeFilter) {
  return joinColumns(
    rangeSummaryColumns(filter, {
      artist: artistName,
      onOffline: onOfflineLabel,
    }),
  );
}

/**
 * Range columns as one line, as `rangeLabel` describes.
 */
function joinColumns(columns: readonly (readonly string[])[]) {
  return columns
    .filter((values) => values.length > 0)
    .map((values) =>
      values
        .map((value) =>
          hasBidiControl(value) ? `\u2068${value}\u2069` : value,
        )
        .join(" / "),
    )
    .join("\u00a0· ");
}

/**
 * A stored on/offline value as the filters name it.
 */
export function onOfflineLabel(value: string) {
  return value === "online"
    ? m.filter_online_digital()
    : m.filter_online_physical();
}

/**
 * What a want row asks for, without its count. An "any of" row reads as
 * how many collections it takes, "Any of 4 collections", leaving which
 * they are to the cards under it.
 */
export function wantLabel(want: ListingFeedWant) {
  switch (want.kind) {
    case "exact":
      return objektName(want.collection, want.objekt);
    case "range":
      return rangeLabel(want.filter);
    case "choice":
      return m.listing_want_any_of_count({ count: want.options.length });
    case "payment":
      return `${want.amount} ${want.currency}`;
  }
}

/**
 * A want row with its count, "5× Atom02 · ARTMS · First".
 */
export function wantText(want: ListingFeedWant) {
  return want.kind === "payment"
    ? wantLabel(want)
    : `${want.count}× ${wantLabel(want)}`;
}

/**
 * Every want row in posted order, as the phone card's subtitle under how
 * many objekts it asks for: a row asking for one drops its "1×".
 */
export function wantsCaption(wants: readonly ListingFeedWant[]) {
  return wants
    .map((want) =>
      want.kind === "payment" || want.count === 1
        ? wantLabel(want)
        : wantText(want),
    )
    .join(", ");
}

/**
 * Every want row in posted order, as one line.
 */
export function wantsSummary(wants: readonly ListingFeedWant[]) {
  return wants.map(wantText).join(", ");
}

/**
 * What a feed row's Asking column is titled: its one row as wantLabel()
 * reads it, a range by its narrowed values, "Atom02 · KimLip · First", else
 * how many objekts its rows ask for, as Offering titles several.
 */
export function askingTitle(wants: readonly ListingFeedWant[]) {
  const [only] = wants;
  if (only !== undefined && wants.length === 1) {
    return wantLabel(only);
  }
  return m.market_listings_objekts({ count: wantedObjektCount(wants) });
}

/**
 * How many rows of each kind a listing asks for, as the Looking for heading
 * sums them up: "1 range · 1 exact · 1 any of".
 */
export function wantKindsSummary(wants: readonly ListingFeedWant[]) {
  const count = (kind: ListingFeedWant["kind"]) =>
    wants.filter((want) => want.kind === kind).length;
  const ranges = count("range");
  const exact = count("exact");
  const choices = count("choice");
  const payments = count("payment");
  return [
    ranges > 0 && m.listing_detail_summary_ranges({ count: ranges }),
    exact > 0 && m.listing_detail_summary_exact({ count: exact }),
    choices > 0 && m.listing_detail_summary_choices({ count: choices }),
    payments > 0 && m.listing_detail_summary_payments({ count: payments }),
  ]
    .filter((part) => part !== false)
    .join(" · ");
}

/**
 * The one artist a range narrows to, which its tile and badges show; null
 * when it takes any artist or several.
 */
export function rangeArtist(filter: RangeFilter): ValidArtist | null {
  const [only] = filter.artist;
  if (only === undefined || filter.artist.length > 1) return null;
  return (
    validArtists.find(
      (artist) => artist.toLowerCase() === only.toLowerCase(),
    ) ?? null
  );
}

/**
 * How the composer shows an offered objekt or a collection an exact or "any
 * of" row names. It sits beside the form's values, which carry only token
 * ids and slugs.
 */
export type ComposerShown = {
  name: string;
  serial: number | null;
  collection: Objekt.Collection | null;
};

export type ComposerDisplay = {
  tokens: ReadonlyMap<number, ComposerShown>;
  collections: ReadonlyMap<string, ComposerShown>;
};

export const emptyComposerDisplay: ComposerDisplay = {
  tokens: new Map(),
  collections: new Map(),
};

/**
 * What the composer needs to show a listing's current terms.
 */
export function listingComposerDisplay(listing: TradeListing): ComposerDisplay {
  return {
    tokens: new Map(
      listing.items.map((item) => [
        item.tokenId,
        {
          name: objektName(item.collection, item.attributes),
          serial: item.serial,
          collection: item.collection,
        },
      ]),
    ),
    collections: new Map(
      listing.wants.flatMap((want): [string, ComposerShown][] => {
        switch (want.kind) {
          case "exact":
            return [
              [
                want.objekt.slug,
                {
                  name: objektName(want.collection, want.objekt),
                  serial: null,
                  collection: want.collection,
                },
              ],
            ];
          case "choice":
            return want.options.map((option) => [
              option.slug,
              {
                name: objektName(option.collection, option),
                serial: null,
                collection: option.collection,
              },
            ]);
          case "range":
          case "payment":
            return [];
        }
      }),
    ),
  };
}

/**
 * A collection as the composer names it.
 */
export function collectionShown(collection: Objekt.Collection): ComposerShown {
  return {
    name: `${collection.season} ${collection.member} ${collection.collectionNo}`,
    serial: null,
    collection,
  };
}

/**
 * Why an objekt can't be offered, as a card's label names it.
 */
export function refusalLabel(reason: TokenRefusalReason) {
  switch (reason) {
    case "not_owned":
      return m.listing_composer_pill_not_owned();
    case "untransferable":
      return m.listing_composer_pill_untransferable();
    case "locked":
      return m.common_locked();
    case "live":
      return m.listing_composer_pill_live();
  }
}

/**
 * Why a listing's objekt can't be picked, as its card names it, or null
 * when it's free.
 */
export function availabilityLabel(availability: PoolAvailability) {
  switch (availability.kind) {
    case "free":
      return null;
    case "in_trade":
      return m.listing_composer_pill_live();
    case "traded":
      return m.listing_detail_pill_traded();
    case "blocked":
      switch (availability.reason) {
        case "moved":
          return m.listing_detail_pill_moved();
        case "untransferable":
          return m.listing_composer_pill_untransferable();
        case "locked":
          return m.common_locked();
      }
  }
}

/**
 * How many objekts one trade from the listing swaps on each side: its unit
 * size for the want rows' total, "1 : 5". Null for a bundle (hasRatio(),
 * against the `posted` objekts it has ever offered), whose one trade takes
 * everything.
 */
export function listingRatio(
  listing: { unitSize: number; wants: readonly ListingFeedWant[] },
  posted: number,
): TradeRatio | null {
  return hasRatio(listing.unitSize, posted)
    ? { give: listing.unitSize, get: wantedObjektCount(listing.wants) }
    : null;
}

/**
 * Why an objekt in the viewer's own collection can't be offered or given,
 * as its card names it: the reason posting and accepting would give.
 */
export function offerBlock(objekt: CosmoObjekt, flags: TokenFlags) {
  const reason = heldTokenRefusal(
    { tokenId: Number(objekt.tokenId), transferable: objekt.transferable },
    flags,
  );
  return reason === null ? null : refusalLabel(reason);
}

/**
 * Whether a listing ended the way its poster means one to, traded or
 * withdrawn, rather than broken, removed or timed out (closed with the one
 * trade it ever made).
 */
export function endedNormally(
  state: ClosedListingState,
): state is Extract<ClosedListingState, { status: "filled" | "withdrawn" }> {
  return state.status === "filled" || state.status === "withdrawn";
}

/**
 * The collections a want row's picker is held to: an exact row's one
 * collection, which its artist, member, season and number pin, a range's
 * columns, or every value of an "any of" row's collections, since a scope
 * can't pair them up and the claim's check narrows the picks.
 */
export function wantScope(
  want: Exclude<ListingFeedWant, { kind: "payment" }>,
): PickerScope {
  if (want.kind === "range") {
    const { filter } = want;
    return {
      artist: filter.artist.flatMap((artist) => toUiArtist(artist) ?? []),
      member: filter.member,
      season: filter.season,
      class: filter.class,
      onOffline: filter.on_offline,
      collectionNo: [],
    };
  }
  if (want.kind === "choice") {
    const values = (pick: (option: ObjektAttributes) => string) => [
      ...new Set(want.options.map(pick)),
    ];
    return {
      artist: values((option) => option.artist).flatMap(
        (artist) => toUiArtist(artist) ?? [],
      ),
      member: values((option) => option.member),
      season: values((option) => option.season),
      class: values((option) => option.class),
      onOffline: validOnlineTypes.filter((type) =>
        want.options.some((option) => option.onOffline === type),
      ),
      collectionNo: values((option) => collectionNumber(null, option)),
    };
  }
  const { objekt } = want;
  const artist = toUiArtist(objekt.artist);
  return {
    artist: artist === undefined ? [] : [artist],
    member: [objekt.member],
    season: [objekt.season],
    class: [objekt.class],
    onOffline: validOnlineTypes.filter((type) => type === objekt.onOffline),
    collectionNo: [collectionNumber(want.collection, objekt)],
  };
}

/**
 * An objekt from the viewer's collection as a pick for a want row, with the
 * indexer values the picks are checked against.
 */
export function listingPick(objekt: CosmoObjekt): ListingPick {
  const { collection, objekt: token } = Objekt.fromLegacy(objekt);
  return {
    tokenId: token.tokenId,
    serial: token.serial,
    attributes: {
      slug: collection.slug,
      artist: collection.artist,
      member: collection.member,
      season: collection.season,
      class: collection.class,
      onOffline: collection.onOffline,
    },
    collection,
  };
}

// a pick as a card shows it, with its token id
export function pickShown(
  pick: ListingPick,
): ComposerShown & { tokenId: number } {
  return {
    tokenId: pick.tokenId,
    name: objektName(pick.collection, pick.attributes),
    serial: pick.serial,
    collection: pick.collection,
  };
}

/**
 * What the card of an objekt on the poster's own listing says, or null
 * when it's free: a live trade or one that took it, that it left their
 * account, or why they can't give it now.
 */
export function standingLabel(standing: PoolStanding) {
  switch (standing.kind) {
    case "free":
      return null;
    case "in_trade":
      return m.listing_composer_pill_live();
    case "sent":
      return m.listing_poster_pill_sent();
    case "traded":
      return m.listing_detail_pill_traded();
    case "gone":
      return m.listing_detail_pill_gone();
    case "blocked":
      return availabilityLabel(standing);
  }
}

/**
 * The line under that card's name: "Available", who the live trade holding
 * it is with, who it was sent or traded to, or that it left the poster's
 * account.
 */
export function standingNote(standing: PoolStanding) {
  switch (standing.kind) {
    case "free":
      return m.listing_poster_note_available();
    case "in_trade":
      return standing.claimer === null
        ? m.listing_poster_note_other_trade()
        : m.listing_poster_note_with({ name: partyName(standing.claimer) });
    case "sent":
      return m.listing_poster_note_sent_to({
        name: partyName(standing.claimer),
      });
    case "traded":
      return m.listing_poster_note_traded_to({
        name: partyName(standing.claimer),
      });
    case "gone":
      return m.listing_poster_note_gone();
    case "blocked":
      return m.listing_poster_note_blocked();
  }
}

/**
 * How a listing's objekts stand, as the heading over them sums them up:
 * "3 available · 2 in trades · 1 sent · 2 traded · 1 gone", leaving out
 * what none are. The poster reads their standings (PoolStanding), anyone
 * else the pool's availability, whose kinds are among them.
 */
export function standingsSummary(
  standings: readonly { kind: PoolStanding["kind"] }[],
) {
  const parts = [
    { kind: "free", message: m.market_listings_available },
    { kind: "in_trade", message: m.listing_poster_pool_in_trades },
    { kind: "sent", message: m.listing_poster_pool_sent },
    { kind: "traded", message: m.listing_poster_pool_traded },
    { kind: "gone", message: m.listing_poster_pool_gone },
    { kind: "blocked", message: m.listing_poster_pool_blocked },
  ] satisfies {
    kind: PoolStanding["kind"];
    message: (inputs: { count: number }) => string;
  }[];
  return parts
    .flatMap(({ kind, message }) => {
      const count = standings.filter(
        (standing) => standing.kind === kind,
      ).length;
      return count > 0 ? [message({ count })] : [];
    })
    .join(" · ");
}
