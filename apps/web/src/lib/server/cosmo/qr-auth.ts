import { createServerOnlyFn } from "@tanstack/react-start";
import { browserless, cosmo } from "../http";
import type { AuthTicket, QueryTicket } from "@/lib/universal/cosmo/qr-auth";
import { env } from "@/lib/env/server";

/**
 * Headers to use when interacting with the webshop.
 */
export const cosmoShopHeaders = {
  Host: "shop.cosmo.fans",
  Origin: "https://shop.cosmo.fans",
};

const bql = `
mutation COSMORecaptchaToken {
  goto(url: "https://shop.cosmo.fans/ko/login/landing", waitUntil: networkIdle, timeout: 7500) {
    status
  }
  getToken: evaluate(
    content: """
    (async () => {
    	 const lib = window.grecaptcha;
      return await new Promise((resolve, reject) => {
        lib.ready(() => {
          lib.execute('${env.COSMO_RECAPTCHA_KEY}', {
             action: "login",
           })
           .then(resolve)
           .catch(reject);
        });
      });
    })()
    """
    timeout: 1000
  ) {
    value
  }
}
`;

type RecaptchaResult = {
  data: {
    getToken: {
      value: string;
    } | null;
  };
};

/**
 * Use a headless browser to get the reCAPTCHA token.
 */
export const getRecaptchaToken = createServerOnlyFn(async () => {
  const result = await browserless<RecaptchaResult>("/", {
    method: "POST",
    body: JSON.stringify({
      query: bql,
      operationName: "COSMORecaptchaToken",
    }),
  });

  if (!result.data.getToken) {
    console.error("Failed to get reCAPTCHA token", result);
    throw new Error("Failed to get reCAPTCHA token");
  }

  return result.data.getToken.value;
});

/**
 * Exchange a Google reCAPTCHA token for a login ticket.
 */
export const exchangeLoginTicket = createServerOnlyFn(
  async (recaptchaToken: string) => {
    return await cosmo<AuthTicket>(
      `/bff/v1/users/auth/login/native/qr/ticket`,
      {
        method: "POST",
        headers: cosmoShopHeaders,
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
  },
);

/**
 * Query the ticket status.
 */
export const queryTicket = createServerOnlyFn(async (ticket: string) => {
  return await cosmo<QueryTicket>(`/bff/v1/users/auth/login/native/qr/ticket`, {
    headers: cosmoShopHeaders,
    query: {
      tid: crypto.randomUUID(),
      ticket,
    },
  });
});

/**
 * Certify the ticket.
 */
export const certifyTicket = createServerOnlyFn(
  async (otp: number, ticket: string) => {
    return await cosmo.raw<void>(
      `/bff/v1/users/auth/login/native/qr/ticket/certify`,
      {
        method: "POST",
        headers: cosmoShopHeaders,
        body: {
          otp,
          ticket,
        },
        query: {
          tid: crypto.randomUUID(),
        },
      },
    );
  },
);
