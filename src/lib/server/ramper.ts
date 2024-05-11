import "server-only";
import { env } from "@/env.mjs";
import { ofetch } from "ofetch";

const ORIGIN = "https://modhaus.v1.ramper.xyz";

type RamperError = {
  success: false;
  error: string;
};

type SendLoginEmail = {
  transactionId: string;
  email: string;
};

type SendLoginEmailResult =
  | {
      success: true;
      pendingToken: string;
    }
  | RamperError;

/**
 * Sends a magic link email to the given address.
 */
export async function sendLoginEmail({ transactionId, email }: SendLoginEmail) {
  return await ofetch<SendLoginEmailResult>(`${env.RAMPER_URL}/appSend`, {
    method: "POST",
    body: {
      appId: env.NEXT_PUBLIC_COSMO_APP_ID,
      transactionId,
      email,
    },
    headers: {
      Origin: ORIGIN,
      Referer: ORIGIN + "/",
      "User-Agent": env.RAMPER_USERAGENT,
    },
  });
}

type ExchangeTokenResult =
  | {
      success: true;
      customToken: string;
      newAccount: boolean;
      ssoCredential: {
        idToken: string;
        refreshToken: string;
        rt2: string;
      };
    }
  | RamperError;

type ExchangeToken = {
  transactionId: string;
  pendingToken: string;
};

/**
 * Exchange login token with Ramper.
 */
export async function exchangeToken({
  transactionId,
  pendingToken,
}: ExchangeToken) {
  return await ofetch<ExchangeTokenResult>(`${env.RAMPER_URL}/exchangeToken`, {
    method: "POST",
    body: {
      appId: env.NEXT_PUBLIC_COSMO_APP_ID,
      transactionId,
      pendingToken,
    },
    headers: {
      Origin: ORIGIN,
      Referer: ORIGIN + "/",
      "User-Agent": env.RAMPER_USERAGENT,
    },
  });
}

const errorMap: Record<string, string> = {
  // user hasn't confirmed the login request yet
  "This email has not been validated yet.":
    "Confirm the login request first by clicking the link in the email.",

  // email is invalid
  "Invalid email address": "Email address is invalid.",

  // rate limit
  "Wait for 1 minute before sending the next request":
    "Slow down! Try again in a minute.",

  // ramper is down?
  "Something went wrong, please try again.":
    "Ramper is experiencing issues, please try again later.",

  // account was made with social auth maybe?
  "Error creating email login record":
    "Error logging in, please try again later.",
};

/**
 * Maps a Ramper error to a human-readable message.
 */
export function getRamperErrorMessage(error: RamperError, context: string) {
  const message = errorMap[error.error];
  if (message === undefined) {
    console.error(`ramper::${context}:`, error);
    return "Ramper may be experiencing issues, please try again later.";
  }

  return message;
}
