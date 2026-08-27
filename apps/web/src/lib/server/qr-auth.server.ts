import { env } from "@/lib/env/server";
import { runCosmo } from "@apollo/cosmo/runtime";
import {
  exchangeLoginTicket,
  getRecaptchaToken,
} from "@apollo/cosmo/server/qr-auth";

/**
 * Get a reCAPTCHA token via a headless browser, then exchange it for a
 * COSMO QR login ticket.
 */
export async function createLoginTicket(signal?: AbortSignal) {
  const recaptcha = await getRecaptchaToken({
    recaptchaKey: env.COSMO_RECAPTCHA_KEY,
    endpoint: env.CDP_ENDPOINT,
  });

  return await runCosmo(exchangeLoginTicket(recaptcha), signal);
}
