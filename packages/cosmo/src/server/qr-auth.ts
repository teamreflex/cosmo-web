import { Effect } from "effect";
import { Cookies, HttpBody } from "effect/unstable/http";
import puppeteer from "puppeteer-core";
import { AuthTicketSchema, QueryTicketSchema } from "../schema/qr-auth.ts";
import { cosmoShopClient, decodeBody } from "./http.ts";

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

export interface CertifyTicketResult {
  status: number;
  cookies: Record<string, string>;
}

/**
 * Exchange a Google reCAPTCHA token for a login ticket.
 */
export const exchangeLoginTicket = Effect.fn("Cosmo.exchangeLoginTicket")(
  function* (recaptchaToken: string) {
    const client = yield* cosmoShopClient;
    return yield* client
      .post("/bff/v3/users/login-by-qr/ticket", {
        body: HttpBody.jsonUnsafe({
          recaptcha: {
            action: "login",
            token: recaptchaToken,
          },
        }),
      })
      .pipe(Effect.flatMap(decodeBody(AuthTicketSchema)));
  },
);

/**
 * Query the ticket status.
 */
export const queryTicket = Effect.fn("Cosmo.queryTicket")(function* (
  ticket: string,
) {
  const client = yield* cosmoShopClient;
  return yield* client
    .get("/bff/v3/users/login-by-qr/ticket", { urlParams: { ticket } })
    .pipe(Effect.flatMap(decodeBody(QueryTicketSchema)));
});

/**
 * Certify the ticket. Returns the response status and cookies so the caller can extract the granted session.
 */
export const certifyTicket = Effect.fn("Cosmo.certifyTicket")(function* (
  otp: number,
  ticket: string,
) {
  const client = yield* cosmoShopClient;
  return yield* client
    .post("/bff/v3/users/login-by-qr/certify", {
      body: HttpBody.jsonUnsafe({ otp, ticket }),
    })
    .pipe(
      Effect.map((response): CertifyTicketResult => ({
        status: response.status,
        cookies: Cookies.toRecord(response.cookies),
      })),
    );
});
