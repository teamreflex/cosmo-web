import { fetchCookie, putCookie } from "@/lib/server/cookies.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * The market's dismissable notices: the market's rules on its browsing
 * pages, and the listing composer's confirmation before a listing takes
 * offers. Each is remembered in a cookie of its name.
 */
const noticeSchema = z.enum(["market-notice", "range-offers-notice"]);
export type Notice = z.infer<typeof noticeSchema>;

// bump a notice's version to show it again to everyone who dismissed an older one
const NOTICE_VERSIONS = {
  "market-notice": 1,
  "range-offers-notice": 1,
} satisfies Record<Notice, number>;
// a year, in seconds
const NOTICE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Which notices this browser has dismissed at their current version.
 */
export const $fetchDismissedNotices = createServerFn({
  method: "GET",
}).handler(() => {
  const dismissed = (notice: Notice) =>
    fetchCookie<number>(notice) === NOTICE_VERSIONS[notice];
  return {
    "market-notice": dismissed("market-notice"),
    "range-offers-notice": dismissed("range-offers-notice"),
  } satisfies Record<Notice, boolean>;
});

/**
 * Remember for a year that this browser dismissed a notice's current version.
 */
export const $dismissNotice = createServerFn({ method: "POST" })
  .validator(z.object({ notice: noticeSchema }))
  .handler(({ data }) => {
    putCookie({
      key: data.notice,
      value: NOTICE_VERSIONS[data.notice],
      maxAge: NOTICE_MAX_AGE,
    });
  });
