import { createFileRoute } from "@tanstack/react-router";
import { captureException } from "@sentry/tanstackstart-react";
import {
  exchangeLoginTicket,
  getRecaptchaToken,
} from "@apollo/cosmo/server/qr-auth";
import { $fetchCurrentUser } from "@/lib/queries/core";
import { getCorsHeaders } from "@/lib/server/cors";
import { env } from "@/lib/env/server";

export const Route = createFileRoute("/api/cosmo/qr-auth/recaptcha")({
  server: {
    handlers: {
      /**
       * Use a headless browser to get the reCAPTCHA token, then exchange it for a login ticket.
       */
      GET: async ({ request }) => {
        const user = await $fetchCurrentUser();
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

        // use browserless to get the recaptcha token
        try {
          var recaptcha = await getRecaptchaToken({
            recaptchaKey: env.COSMO_RECAPTCHA_KEY,
            browserless: {
              baseUrl: env.BROWSERLESS_BASE_URL,
              apiKey: env.BROWSERLESS_API_KEY,
            },
          });
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
