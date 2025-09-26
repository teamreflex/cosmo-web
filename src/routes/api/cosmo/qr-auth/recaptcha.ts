import { createFileRoute } from "@tanstack/react-router";
import { Ratelimit } from "@upstash/ratelimit";
import { waitUntil } from "@vercel/functions";
import { captureException } from "@sentry/tanstackstart-react";
import { fetchCurrentUser } from "@/lib/queries/core";
import { IP_HEADER } from "@/lib/server/auth";
import { redis } from "@/lib/server/cache";
import { getCorsHeaders } from "@/lib/server/cors";
import {
  exchangeLoginTicket,
  getRecaptchaToken,
} from "@/lib/server/cosmo/qr-auth";

export const Route = createFileRoute("/api/cosmo/qr-auth/recaptcha")({
  server: {
    handlers: {
      /**
       * Use a headless browser to get the reCAPTCHA token, then exchange it for a login ticket.
       */
      GET: async ({ request }) => {
        const ip = request.headers.get(IP_HEADER) ?? undefined;
        const user = await fetchCurrentUser();
        const headers = getCorsHeaders(request);

        // auth check
        if (!user) {
          return Response.json(
            { error: "unauthorized" },
            {
              status: 401,
              headers,
            },
          );
        }

        // rate limit check
        const identifier = `user:${user.id}`;
        const { success, pending } = await ratelimit.limit(identifier, {
          ip,
        });

        // don't stop execution until analytics are done
        waitUntil(pending);

        // rate limit exceeded
        if (!success) {
          return Response.json(
            { error: "rate limit exceeded" },
            {
              status: 429,
              headers,
            },
          );
        }

        // use browserless to get the recaptcha token
        try {
          var recaptcha = await getRecaptchaToken();
        } catch (err) {
          captureException(err);
          console.error("[getRecaptchaToken] error:", err);
          return Response.json(
            { error: "error getting recaptcha token" },
            {
              status: 500,
              headers,
            },
          );
        }

        // exchange recaptcha token for a cosmo qr ticket
        try {
          var ticket = await exchangeLoginTicket(recaptcha);
        } catch (err) {
          console.error("[exchangeLoginTicket] error:", err);
          return Response.json(
            { error: "error exchanging login ticket" },
            {
              status: 500,
              headers,
            },
          );
        }

        return Response.json(ticket, {
          headers,
        });
      },

      /**
       * Handle CORS preflight requests.
       */
      OPTIONS: ({ request }) => {
        const headers = getCorsHeaders(request);

        return new Response(null, {
          status: 200,
          headers,
        });
      },
    },
  },
});

/**
 * Upstash ratelimiter ensuring that the same IP address can only make 1 request per 5 minutes.
 */
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(1, "5 m"),
  analytics: true,
  prefix: "rl:recaptcha",
});
