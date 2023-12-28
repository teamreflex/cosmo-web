import {
  ValidArtists,
  ValidClasses,
  ValidOnlineTypes,
  ValidSeasons,
  ValidSorts,
} from "@/lib/universal/cosmo/common";
import {
  createParser,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsString,
  parseAsStringEnum,
  useQueryState,
  useQueryStates,
} from "next-usequerystate";
import { useCallback, useMemo, useState } from "react";

export type CosmoFilters = {
  member: string | null;
  artist: ValidArtists | null;
  sort: ValidSorts | null;
  class: ValidClasses[] | null;
  season: ValidSeasons[] | null;
  on_offline: ValidOnlineTypes[] | null;
  transferable: true | null | undefined;
  gridable: true | null | undefined;
  used_for_grid: true | null | undefined;
  collection: string | null;
  collectionNo: string[] | null;
};

export type UpdateCosmoFilters = <TKey extends keyof CosmoFilters>(
  key: TKey,
  value: CosmoFilters[TKey]
) => void;

export function useCosmoFilters() {
  // mobile filter toggle
  const [showFilters, setShowFilters] = useState(false);

  // use separate state for apollo features so a refetch doesn't occur
  const [showLocked, setShowLocked] = useQueryState(
    "showLocked",
    parseAsBoolean.withDefault(true)
  );

  // setup cosmo filters
  const [cosmoFilters, _setCosmoFilters] = useQueryStates({
    member: parseAsString,
    artist: parseAsStringEnum<ValidArtists>(Object.values(ValidArtists)),
    sort: parseAsStringEnum<ValidSorts>(Object.values(ValidSorts)),
    class: parseAsArrayOf(
      parseAsStringEnum<ValidClasses>(Object.values(ValidClasses))
    ),
    season: parseAsArrayOf(
      parseAsStringEnum<ValidSeasons>(Object.values(ValidSeasons))
    ),
    on_offline: parseAsArrayOf(
      parseAsStringEnum<ValidOnlineTypes>(Object.values(ValidOnlineTypes))
    ),
    transferable: parseAsNullableBoolean,
    gridable: parseAsNullableBoolean,
    used_for_grid: parseAsNullableBoolean,
    // grid param: "Atom01 JinSoul 101Z"
    collection: parseAsString,
    // index param: ["101Z", "102Z"]
    collectionNo: parseAsArrayOf(parseAsString),
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setCosmoFilters = useCallback(_setCosmoFilters, []);

  const searchParams = useMemo(() => {
    return toSearchParams(cosmoFilters, true);
  }, [cosmoFilters]);

  // type-safe filter update function
  const updateCosmoFilters = useCallback(
    <TFilter extends keyof CosmoFilters>(
      key: TFilter,
      value: CosmoFilters[TFilter]
    ) => {
      setCosmoFilters((filters) => ({
        ...filters,
        [key]: value,
      }));
    },
    [setCosmoFilters]
  );

  return [
    searchParams,
    showFilters,
    setShowFilters,
    showLocked,
    setShowLocked,
    cosmoFilters,
    setCosmoFilters,
    updateCosmoFilters,
  ] as const;
}

// cosmo only accepts "true" or empty/null/undefined for boolean params
const parseAsNullableBoolean = createParser({
  parse(query) {
    return query === "true" ? true : null;
  },
  serialize(value) {
    return value === true ? "true" : "";
  },
});

/**
 * Converts a parsed query string into a Cosmo-compatible URLSearchParams.
 */
export function toSearchParams(
  input: CosmoFilters,
  join = false
): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    // filter out empty values
    if (
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      continue;
    }

    switch (typeof value) {
      case "string":
        query.set(key, value);
        break;
      case "boolean":
        if (value) {
          query.set(key, "true");
        }
        break;
      case "object":
        if (Array.isArray(value)) {
          if (join) {
            query.set(key, value.join(","));
          } else {
            for (const item of value) {
              query.append(key, item);
            }
          }
        }
        break;
    }
  }

  return query;
}
