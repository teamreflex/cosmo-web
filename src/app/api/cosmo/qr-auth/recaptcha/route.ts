import { getSession } from "@/app/data-fetching";
import { env } from "@/env";
import { IP_HEADER } from "@/lib/server/auth";
import { redis } from "@/lib/server/cache";
import {
  exchangeLoginTicket,
  getRecaptchaToken,
} from "@/lib/server/cosmo/qr-auth";
import { Ratelimit } from "@upstash/ratelimit";
import { after } from "next/server";

/**
 * Handle CORS preflight requests.
 */
export async function OPTIONS(req: Request) {
  const headers = new Headers([
    ["Access-Control-Allow-Methods", "GET, OPTIONS"],
    ["Access-Control-Allow-Headers", "Content-Type, Authorization"],
    ["Access-Control-Max-Age", "86400"],
    ["Vary", "Origin"],
  ]);

  const origin = req.headers.get("Origin");
  if (origin === env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  return new Response(null, {
    status: 200,
    headers,
  });
}

/**
 * Use a headless browser to get the reCAPTCHA token, then exchange it for a login ticket.
 */
export async function GET(req: Request) {
  const ip = req.headers.get(IP_HEADER) ?? undefined;
  const session = await getSession();

  // auth check
  if (!session) {
    return Response.json(
      { error: "unauthorized" },
      {
        status: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // rate limit check
  const identifier = `user:${session.session.userId}`;
  const { success, pending } = await ratelimit.limit(identifier, {
    ip,
  });

  // don't stop execution until analytics are done
  after(pending);

  // rate limit exceeded
  if (!success) {
    return Response.json(
      { error: "rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // use browserless to get the recaptcha token
  try {
    var recaptcha = await getRecaptchaToken();
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "error getting recaptcha token" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // exchange recaptcha token for a cosmo qr ticket
  try {
    var ticket = await exchangeLoginTicket(recaptcha);
  } catch (err) {
    return Response.json(
      { error: "error exchanging login ticket" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  return Response.json(ticket, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * Upstash ratelimiter ensuring that the same IP address can only make 1 request per 5 minutes.
 */
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(1, "5 m"),
  analytics: true,
  prefix: "rl:recaptcha",
});
