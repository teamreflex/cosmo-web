import { wrapFetchWithSentry } from "@sentry/tanstackstart-react";
import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "./i18n/server.js";

/**
 * Custom server entry that provides Paraglide cookie handling and reports
 * SSR request errors to Sentry.
 */
export default createServerEntry(
  wrapFetchWithSentry({
    fetch(req) {
      return paraglideMiddleware(req, ({ request }) => handler.fetch(request));
    },
  }),
);
