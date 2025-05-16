import {
  exchangeLoginTicket,
  getRecaptchaToken,
} from "@/lib/server/cosmo/qr-auth";

/**
 * Use a headless browser to get the reCAPTCHA token, then exchange it for a login ticket.
 */
export async function GET() {
  try {
    var recaptcha = await getRecaptchaToken();
  } catch (err) {
    console.error(err);
    return Response.json(
      { error: "error getting recaptcha token" },
      { status: 500 }
    );
  }

  try {
    var ticket = await exchangeLoginTicket(recaptcha);
  } catch (err) {
    return Response.json(
      { error: "error exchanging login ticket" },
      { status: 500 }
    );
  }

  return Response.json(ticket);
}
