import {
  createParser,
  parseAsArrayOf,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import type {
  ValidArtist,
  ValidOnlineType,
  ValidSort,
} from "@/lib/universal/cosmo/common";
import {
  validArtists,
  validOnlineTypes,
  validSorts,
} from "@/lib/universal/cosmo/common";

export function useCosmoFilters() {
  return useQueryStates({
    member: parseAsString,
    artist: parseAsStringEnum<ValidArtist>(Object.values(validArtists)),
    sort: parseAsStringEnum<ValidSort>(Object.values(validSorts)),
    class: parseAsArrayOf(parseAsString),
    season: parseAsArrayOf(parseAsString),
    on_offline: parseAsArrayOf(
      parseAsStringEnum<ValidOnlineType>(Object.values(validOnlineTypes))
    ),
    transferable: parseAsNullableBoolean,
    gridable: parseAsNullableBoolean,
    used_for_grid: parseAsNullableBoolean,
    // grid param: "Atom01 JinSoul 101Z"
    collection: parseAsString,
    // index param: ["101Z", "102Z"]
    collectionNo: parseAsArrayOf(parseAsString),
  });
}

// cosmo only accepts "true" or empty/null/undefined for boolean params
export const parseAsNullableBoolean = createParser({
  parse(query) {
    return query === "true" ? true : null;
  },
  serialize(value) {
    return value === true ? "true" : "";
  },
});

type UseCosmoFiltersReturnType = ReturnType<typeof useCosmoFilters>;
export type CosmoFilters = UseCosmoFiltersReturnType[0];
export type SetCosmoFilters = UseCosmoFiltersReturnType[1];
export type PropsWithFilters = {
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
};
