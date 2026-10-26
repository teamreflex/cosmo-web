import { fetchCookie, putCookie } from "@/lib/server/cookies.server";
import { createServerFn } from "@tanstack/react-start";

// bump to show the market notice again to everyone who accepted an older one
const MARKET_NOTICE_VERSION = 1;

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
      maxAge: 60 * 60 * 24 * 365,
    });
  },
);
