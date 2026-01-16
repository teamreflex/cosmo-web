import puppeteer from "puppeteer-core";
import type { AuthTicket, QueryTicket } from "../types/qr-auth";
import { cosmoShop, cosmoShopHeaders } from "./http";

export interface QrAuthConfig {
  recaptchaKey: string;
  endpoint: string;
}

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
      referer: cosmoShopHeaders.Host,
    });

    // wait for grecaptcha to be ready before trying to use it
    // @ts-expect-error - window is available in browser context
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
export async function exchangeLoginTicket(recaptchaToken: string) {
  return await cosmoShop<AuthTicket>(
    `/bff/v1/users/auth/login/native/qr/ticket`,
    {
      method: "POST",
      body: {
        recaptcha: {
          action: "login",
          token: recaptchaToken,
        },
      },
      query: {
        tid: crypto.randomUUID(),
      },
    },
  );
}

/**
 * Query the ticket status.
 */
export async function queryTicket(ticket: string) {
  return await cosmoShop<QueryTicket>(
    `/bff/v1/users/auth/login/native/qr/ticket`,
    {
      query: {
        tid: crypto.randomUUID(),
        ticket,
      },
    },
  );
}

/**
 * Certify the ticket.
 */
export async function certifyTicket(otp: number, ticket: string) {
  return await cosmoShop.raw<void>(
    `/bff/v1/users/auth/login/native/qr/ticket/certify`,
    {
      method: "POST",
      body: {
        otp,
        ticket,
      },
      query: {
        tid: crypto.randomUUID(),
      },
    },
  );
}
