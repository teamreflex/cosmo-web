import handler from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "./i18n/server.js";

export default {
  fetch(req: Request): Promise<Response> {
    return paraglideMiddleware(req, ({ request }) => handler.fetch(request));
  },
};
