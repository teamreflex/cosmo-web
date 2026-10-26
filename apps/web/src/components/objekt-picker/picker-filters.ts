import { m } from "@/i18n/messages";
import { formatSerial } from "@/lib/client/objekt-util";
import type { NeighbourSuggestion } from "@/lib/universal/binders";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { userCollectionFrontendSchema } from "@/lib/universal/parsers";
import type {
  ValidArtist,
  ValidOnlineType,
  ValidSort,
} from "@apollo/cosmo/types/common";
import type { z } from "zod";

/**
 * The picker's own filter state. It lives in the editor rather than the URL,
 * so the profile's filters and the picker's never mix.
 */
export type PickerFilters = {
  artist: ValidArtist | null;
  member: string[];
  season: string[];
  class: string[];
  onOffline: ValidOnlineType | null;
  transferable: boolean;
  hideLocked: boolean;
  notInBinder: boolean;
  sort: ValidSort;
};

/**
 * The collections a picker is held to, such as a listing's want row. Each
 * column lists the values it allows, and an empty column allows any; the
 * viewer's own filters only narrow inside it.
 */
export type PickerScope = {
  artist: ValidArtist[];
  member: string[];
  season: string[];
  class: string[];
  onOffline: ValidOnlineType[];
  collectionNo: string[];
};

export type ArtistScopedKey = "member" | "season" | "class";
export type FlagKey = "transferable" | "hideLocked" | "notInBinder";

export const initialPickerFilters: PickerFilters = {
  artist: null,
  member: [],
  season: [],
  class: [],
  onOffline: null,
  transferable: false,
  hideLocked: false,
  notInBinder: false,
  sort: "newest",
};

/**
 * Where a picker's filters start: a scope held to one artist starts on it,
 * since member, season and class only apply within one.
 */
export function scopedPickerFilters(scope: PickerScope | null): PickerFilters {
  const [artist = null, ...others] = scope?.artist ?? [];
  return { ...initialPickerFilters, artist: others.length > 0 ? null : artist };
}

export type PickerFilterAction =
  | { type: "artist"; artist: ValidArtist | null }
  | { type: "toggle"; key: ArtistScopedKey; value: string }
  | { type: "onOffline"; value: ValidOnlineType | null }
  | { type: "flag"; key: FlagKey; value: boolean }
  | { type: "sort"; sort: ValidSort }
  | { type: "suggestion"; suggestion: NeighbourSuggestion }
  | { type: "reset" };

export function pickerFiltersReducer(
  state: PickerFilters,
  action: PickerFilterAction,
): PickerFilters {
  switch (action.type) {
    case "artist":
      // members, seasons and classes belong to one artist, so none carry over
      return action.artist === state.artist
        ? state
        : {
            ...state,
            artist: action.artist,
            member: [],
            season: [],
            class: [],
          };
    case "toggle": {
      const values = state[action.key];
      return {
        ...state,
        [action.key]: values.includes(action.value)
          ? values.filter((value) => value !== action.value)
          : [...values, action.value],
      };
    }
    case "onOffline":
      return { ...state, onOffline: action.value };
    case "flag":
      return { ...state, [action.key]: action.value };
    case "sort":
      return { ...state, sort: action.sort };
    case "suggestion": {
      const { suggestion } = action;
      return {
        ...state,
        artist: suggestion.artist,
        member: suggestion.member === null ? [] : [suggestion.member],
        season: suggestion.season === null ? [] : [suggestion.season],
        class: suggestion.class === null ? [] : [suggestion.class],
      };
    }
    case "reset":
      return { ...initialPickerFilters, artist: state.artist };
  }
}

/**
 * The count on the Filters button. The artist switch sits in the top bar, so
 * it isn't counted.
 */
export function activeFilterCount(filters: PickerFilters) {
  return (
    filters.member.length +
    filters.season.length +
    filters.class.length +
    Number(filters.onOffline !== null) +
    Number(filters.transferable) +
    Number(filters.hideLocked) +
    Number(filters.notInBinder) +
    Number(filters.sort !== "newest")
  );
}

/**
 * Whether the filters already match a suggestion, which hides its chip.
 */
export function isSuggestionApplied(
  filters: PickerFilters,
  suggestion: NeighbourSuggestion,
) {
  const matches = (values: string[], value: string | null) =>
    value === null
      ? values.length === 0
      : values.length === 1 && values[0] === value;

  return (
    filters.artist === suggestion.artist &&
    matches(filters.member, suggestion.member) &&
    matches(filters.season, suggestion.season) &&
    matches(filters.class, suggestion.class)
  );
}

/**
 * Filters the client applies to loaded pages, because the collection query
 * can't express them.
 */
export function hasClientFilters(filters: PickerFilters) {
  return filters.hideLocked || filters.notInBinder;
}

/**
 * The collection query's filters, shaped like the profile's URL filters so an
 * unfiltered picker shares the profile's cached pages. Inside a scope, a
 * column the viewer hasn't narrowed takes the scope's values.
 */
export function toCollectionFilters(
  filters: PickerFilters,
  scope: PickerScope | null = null,
): z.infer<typeof userCollectionFrontendSchema> {
  const list = <T>(values: readonly T[], allowed: readonly T[] = []) => {
    const narrowed = values.length > 0 ? values : allowed;
    return narrowed.length > 0 ? [...narrowed] : undefined;
  };

  return {
    artist: filters.artist ?? undefined,
    member: list(filters.member, scope?.member),
    season: list(filters.season, scope?.season),
    class: list(filters.class, scope?.class),
    on_offline: list(
      filters.onOffline === null ? [] : [filters.onOffline],
      scope?.onOffline,
    ),
    collectionNo: list([], scope?.collectionNo),
    transferable: filters.transferable || undefined,
    sort: filters.sort === "newest" ? undefined : filters.sort,
  };
}

/**
 * A suggestion as one line, such as "ARTMS · Choerry · Atom02 · First".
 */
export function suggestionSummary(
  suggestion: NeighbourSuggestion,
  artistTitle: string,
) {
  return [artistTitle, suggestion.member, suggestion.season, suggestion.class]
    .filter((part) => part !== null)
    .join(" · ");
}

/**
 * Which pockets a suggestion comes from, as a chip prefix ("Like pockets 2
 * and 4:") or a panel caption ("Matches pockets 2 and 4").
 */
export function suggestionSource(
  { pockets: [first, second] }: NeighbourSuggestion,
  kind: "like" | "matches",
) {
  if (second === undefined) {
    return kind === "like"
      ? m.binder_picker_suggestion_one({ pocket: first })
      : m.binder_picker_matches_one({ pocket: first });
  }
  return kind === "like"
    ? m.binder_picker_suggestion_two({ first, second })
    : m.binder_picker_matches_two({ first, second });
}

/**
 * The name a picker card reads out: "HeeJin Atom02 201Z #00217".
 */
export function pickerCardLabel(collection: Objekt.Collection, serial: number) {
  return `${collection.member} ${collection.season} ${collection.collectionNo}${serial > 0 ? ` ${formatSerial(serial)}` : ""}`;
}
