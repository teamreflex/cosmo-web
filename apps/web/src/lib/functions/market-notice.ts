import { fetchCookie, putCookie } from "@/lib/server/cookies.server";
import { createServerFn } from "@tanstack/react-start";

// bump to show the market notice again to everyone who accepted an older one
const MARKET_NOTICE_VERSION = 1;
// bump to show the range confirmation again to everyone who dismissed an older one
const RANGE_OFFERS_NOTICE_VERSION = 1;
// a year, in seconds
const NOTICE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Whether this browser has accepted the current market notice.
 */
export const $fetchMarketNoticeAccepted = createServerFn({
  method: "GET",
}).handler(
  () => fetchCookie<number>("market-notice") === MARKET_NOTICE_VERSION,
);

/**
 * Remember for a year that this browser accepted the current market notice.
 */
export const $acceptMarketNotice = createServerFn({ method: "POST" }).handler(
  () => {
    putCookie({
      key: "market-notice",
      value: MARKET_NOTICE_VERSION,
      maxAge: NOTICE_MAX_AGE,
    });
  },
);

/**
 * Whether this browser chose not to see the current range confirmation again.
 */
export const $fetchRangeOffersNoticeDismissed = createServerFn({
  method: "GET",
}).handler(
  () =>
    fetchCookie<number>("range-offers-notice") === RANGE_OFFERS_NOTICE_VERSION,
);

/**
 * Remember for a year that this browser dismissed the current range confirmation.
 */
export const $dismissRangeOffersNotice = createServerFn({
  method: "POST",
}).handler(() => {
  putCookie({
    key: "range-offers-notice",
    value: RANGE_OFFERS_NOTICE_VERSION,
    maxAge: NOTICE_MAX_AGE,
  });
});
