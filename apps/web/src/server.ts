import handler from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "./i18n/server.js";
import type { ServerEntry } from "@tanstack/react-start/server-entry";

/**
 * Custom server entry that provides Paraglide cookie handling.
 */
export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, ({ request }) => handler.fetch(request));
  },
} satisfies ServerEntry;
