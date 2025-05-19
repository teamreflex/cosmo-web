import { getSession } from "@/app/data-fetching";
import { IP_HEADER } from "@/lib/server/auth";
import { redis } from "@/lib/server/cache";
import { getCorsHeaders } from "@/lib/server/cors";
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
  const headers = getCorsHeaders(req);

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
  const headers = getCorsHeaders(req);

  // auth check
  if (!session) {
    return Response.json(
      { error: "unauthorized" },
      {
        status: 401,
        headers,
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
        headers,
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
        headers,
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
        headers,
      }
    );
  }

  return Response.json(ticket, {
    headers,
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
