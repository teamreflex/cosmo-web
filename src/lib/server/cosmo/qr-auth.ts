import { browserless, cosmoShop } from "../http";
import type { AuthTicket, QueryTicket } from "@/lib/universal/cosmo/qr-auth";
import { env } from "@/env";

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
export async function getRecaptchaToken() {
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
    }
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
    }
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
    }
  );
}
