import { stringifySearchWith } from "@tanstack/react-router";

/**
 * Serialize arrays as CSV (?member=HeeJin,SeoYeon) instead of the default JSON
 * (?member=["HeeJin","SeoYeon"]). parseSearch stays default — each field's
 * castToArray() splits the CSV, and old JSON-array URLs still parse.
 */
const stringifyArrays = stringifySearchWith(
  (value) => (Array.isArray(value) ? value.join(",") : JSON.stringify(value)),
  JSON.parse,
);

/**
 * URLSearchParams percent-encodes commas; restore literal commas (valid per RFC 3986).
 */
export function stringifySearch(search: Parameters<typeof stringifyArrays>[0]) {
  return stringifyArrays(search).replaceAll("%2C", ",");
}
