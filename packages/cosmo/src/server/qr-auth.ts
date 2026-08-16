import puppeteer from "puppeteer-core";
import * as qrAuth from "../effect/qr-auth";
import { runCosmo } from "./runtime";

export interface QrAuthConfig {
  recaptchaKey: string;
  endpoint: string;
}

const cosmoShopHost = "shop.cosmo.fans";

/**
 * Use a headless browser to get the reCAPTCHA token.
 */
export async function getRecaptchaToken(config: QrAuthConfig) {
  const browser = await puppeteer.connect({
    browserWSEndpoint: config.endpoint,
  });

  try {
    const page = await browser.newPage();
    await page.goto("https://shop.cosmo.fans/en/login/landing", {
      referer: cosmoShopHost,
    });

    // wait for grecaptcha to be ready before trying to use it
    // @ts-expect-error - window is available in browser context
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- runs inside the browser page; grecaptcha is an injected global
    await page.waitForFunction(() => typeof window.grecaptcha !== "undefined", {
      timeout: 10000,
    });

    const value = await page.evaluate(async (key) => {
      // @ts-expect-error - window is available in browser context
      const lib = window.grecaptcha;
      return await new Promise((resolve, reject) => {
        lib.ready(() => {
          lib
            .execute(key, {
              action: "login",
            })
            .then(resolve)
            .catch(reject);
        });
      });
    }, config.recaptchaKey);

    // SAFETY: the page script resolves with the grecaptcha token string
    return value as string;
  } catch (error) {
    console.error("Failed to get reCAPTCHA token", error);
    throw new Error("Failed to get reCAPTCHA token");
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Exchange a Google reCAPTCHA token for a login ticket.
 */
export async function exchangeLoginTicket(
  recaptchaToken: string,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(qrAuth.exchangeLoginTicket(recaptchaToken), signal);
}

/**
 * Query the ticket status.
 */
export async function queryTicket(
  ticket: string,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(qrAuth.queryTicket(ticket), signal);
}

/**
 * Certify the ticket. Returns the response status and cookies so the caller can extract the granted session.
 */
export async function certifyTicket(
  otp: number,
  ticket: string,
  signal: AbortSignal | null = null,
) {
  return await runCosmo(qrAuth.certifyTicket(otp, ticket), signal);
}
