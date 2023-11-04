import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { getParams } from "remix-params-helper";

export type ValidKey<T extends z.Schema> = keyof z.infer<T>;

export function useTypedSearchParams<T extends z.Schema>(
  schema: T,
  callback?: (params: URLSearchParams) => URLSearchParams
) {
  let params = new URLSearchParams(useSearchParams());

  if (callback) {
    params = callback(params);
  }

  return getParams(params, schema);
}

/**
 * Converts a parsed Zod object back into URLSearchParams.
 */
export function toSearchParams<T extends z.Schema>(
  params: z.infer<T>,
  arrayJoin?: boolean,
  exclude?: ValidKey<T>[]
): URLSearchParams {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    // filter out anything the collection URL doesn't need
    if (exclude && exclude.length && exclude.includes(key)) continue;

    // filter out empty values
    if (
      value === undefined ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      continue;
    }

    switch (typeof value) {
      case "string":
        query.append(key, value);
        break;
      case "number":
        query.append(key, value.toString());
        break;
      case "boolean":
        if (value) {
          query.append(key, "true");
        }
        break;
      case "object":
        if (Array.isArray(value)) {
          if (arrayJoin) {
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
