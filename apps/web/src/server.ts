import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "./i18n/server.js";

/**
 * Custom server entry that provides Paraglide cookie handling.
 */
export default createServerEntry({
  fetch(req) {
    return paraglideMiddleware(req, ({ request }) => handler.fetch(request));
  },
});
