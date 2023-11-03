import { boolean, coerce, number, object, string, enum as znum } from "zod";
import {
  ObjektQueryParams,
  validArtists,
  validClasses,
  validOnlineTypes,
  validSeasons,
  validSorts,
} from "../server/cosmo";

const schema = object({
  showLocked: coerce.boolean(),
  startAfter: number(),
  nextStartAfter: number().optional(),
  member: string().optional(),
  artist: znum(validArtists).optional(),
  sort: znum(validSorts),
  classType: znum(validClasses).array().optional(),
  onlineType: znum(validOnlineTypes).array().optional(),
  season: znum(validSeasons).array().optional(),
  transferable: boolean().optional(),
  gridable: boolean().optional(),
  usedForGrid: boolean().optional(),
  collection: string().optional(),
});

/**
 * Validates collection filters with Zod.
 * @param params URLSearchParams
 */
export function validateCollectionParams(
  params: URLSearchParams
): ObjektQueryParams {
  const result = schema.safeParse({
    showLocked: params.get("showLocked") === "true",
    startAfter: parseInt(params.get("startAfter") ?? "0"),
    nextStartAfter: parseInt(params.get("nextStartAfter") ?? "0"),
    member: params.get("member") || undefined,
    artist: params.get("artist") || undefined,
    sort: params.get("sort") || "newest",
    classType: params.getAll("classType").filter((s) => !!s),
    onlineType: params.getAll("onlineType").filter((s) => !!s),
    season: params.getAll("season").filter((s) => !!s),
    transferable: params.get("transferable") === "true",
    gridable: params.get("gridable") === "true",
    usedForGrid: params.has("usedForGrid")
      ? params.get("usedForGrid") === "true"
      : undefined,
    collection: params.get("collection") || undefined,
  });

  if (result.success) {
    return result.data;
  } else {
    console.log(result.error);
  }

  return {
    startAfter: 0,
    nextStartAfter: 0,
    sort: "newest",
  };
}

export type QueryParamsKey = keyof ObjektQueryParams;

// cosmo uses snake_case and i don't like using snake_case
export type MapMode = "apollo" | "cosmo";
const cosmoKeyMap: Partial<Record<QueryParamsKey, string>> = {
  startAfter: "start_after",
  classType: "class",
  onlineType: "on_offline",
  usedForGrid: "used_for_grid",
};

/**
 * Parses collection filters to URLSearchParams.
 * @param params ObjektQueryParams
 */
export function parseCollectionParams(
  params: ObjektQueryParams,
  mode: MapMode = "apollo",
  filter?: QueryParamsKey[]
): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    // cosmo uses snake case keys
    const mappedKey =
      mode === "cosmo" ? cosmoKeyMap[key as QueryParamsKey] ?? key : key;

    // filter out anything the collection URL doesn't need
    if (filter && filter.length && filter.includes(key as QueryParamsKey))
      continue;
    if (value === undefined) continue;

    switch (typeof value) {
      case "string":
        query.append(mappedKey, value);
        break;
      case "number":
        query.append(mappedKey, value.toString());
        break;
      case "boolean":
        if (value) {
          query.append(mappedKey, "true");
        }
        break;
      case "object":
        if (Array.isArray(value)) {
          if (mode === "apollo") {
            for (const item of value) {
              query.append(mappedKey, item);
            }
          } else {
            query.append(mappedKey, value.join(","));
          }
        }
        break;
    }
  }

  return query;
}
