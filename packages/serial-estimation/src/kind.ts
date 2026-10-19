import type { CollectionObjekts } from "./types";

/**
 * Digital collections handed out as printed QR coupons. Their ids and serials
 * are allocated in blocks when the coupons are printed, so they are numbered
 * like physical collections. The collection number alone is not a signal:
 * regular collections reuse 312, 213, 338, 315 and 375.
 */
const COUPON_SETS = [
  /^binary01-(choerry|haseul|heejin|jinsoul|kimlip)-312z$/,
  /^atom01-(choerry|jinsoul|kimlip)-(213z|338z)$/,
  /^cream02-(hayeon|jiwoo|jiyeon|kotone|xinyu|yeonji)-315z$/,
  /^atom02-(chaewon|hayeon|jiyeon|kotone|lynn|nien|shion|yooyeon)-375z$/,
];

/**
 * How a collection's serials are numbered.
 */
export function collectionKind(
  slug: string,
  onOffline: "online" | "offline",
): CollectionObjekts["kind"] {
  if (onOffline === "offline" || COUPON_SETS.some((set) => set.test(slug))) {
    return "reserved";
  }
  return "sequential";
}
