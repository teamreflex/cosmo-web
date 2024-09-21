import { chromium } from "playwright";
import { cosmo } from "../http";
import { v4 } from "uuid";
import { AuthTicket, QueryTicket } from "@/lib/universal/cosmo/qr-auth";

/**
 * Use a headless browser to get the reCAPTCHA token.
 */
export async function getRecaptchaToken() {
  // launch browser instance
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // navigate to cosmo shop login
  await page.goto("https://shop.cosmo.fans/en/login/landing");

  // click to trigger recaptcha token exchange
  const recaptchaResponse = page.waitForResponse(
    "https://www.recaptcha.net/recaptcha/api2/reload**",
    {
      timeout: 2500,
    }
  );
  await page.getByRole("button", { name: "Continue with Cosmo app" }).click({
    timeout: 2500,
  });

  // wait for recaptcha response
  const response = await recaptchaResponse;
  const recaptchaText = await response.text();

  // parse the token
  const token = recaptchaText.match(/(?<=\["rresp",").*?(?=")/g);

  // close the browser
  await browser.close();

  return token;
}

/**
 * Exchange a Google reCAPTCHA token for a login ticket.
 */
export async function exchangeLoginTicket(recaptchaToken: string) {
  return await cosmo<AuthTicket>(`/bff/v1/users/auth/login/native/qr/ticket`, {
    method: "POST",
    body: {
      recaptcha: {
        action: "login",
        token: recaptchaToken,
      },
    },
    query: {
      tid: v4(),
    },
    cache: "no-cache",
  });
}

/**
 * Query the ticket status.
 */
export async function queryTicket(ticket: string) {
  return await cosmo<QueryTicket>(`/bff/v1/users/auth/login/native/qr/ticket`, {
    query: {
      tid: v4(),
      ticket,
    },
    cache: "no-cache",
  });
}

/**
 * Certify the ticket.
 */
export async function certifyTicket(otp: number, ticket: string) {
  return await cosmo.raw<void>(
    `/bff/v1/users/auth/login/native/qr/ticket/certify`,
    {
      method: "POST",
      body: {
        otp,
        ticket,
      },
      query: {
        tid: v4(),
      },
      cache: "no-cache",
    }
  );
}
