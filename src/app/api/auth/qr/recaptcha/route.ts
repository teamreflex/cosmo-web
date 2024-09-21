import {
  exchangeLoginTicket,
  getRecaptchaToken,
} from "@/lib/server/cosmo/qr-auth";

export const runtime = "nodejs";

/**
 * Use Playwright to get the reCAPTCHA token, then exchange it for a login ticket.
 */
export async function GET() {
  try {
    var recaptcha = await getRecaptchaToken();
  } catch (err) {
    return Response.json(
      { error: "error getting recaptcha token" },
      { status: 500 }
    );
  }

  if (recaptcha === null || recaptcha[0] === undefined) {
    return Response.json(
      { error: "could not parse recaptcha response" },
      { status: 400 }
    );
  }

  try {
    var ticket = await exchangeLoginTicket(recaptcha[0]);
  } catch (err) {
    return Response.json(
      { error: "error exchanging login ticket" },
      { status: 500 }
    );
  }

  return Response.json(ticket);
}
