import "server-only";
import { env } from "@/env.mjs";
import { ofetch } from "ofetch";
import { getErrorMessage } from "../error";

const ORIGIN = "https://modhaus.v1.ramper.xyz";

type SendLoginEmail = {
  transactionId: string;
  email: string;
};

type RamperResponse<T> = {
  success: true;
  data: T;
};

type RamperDataError = {
  success: false;
  error: string;
};

type RamperError = {
  success: false;
  data: RamperDataError;
};

type SendLoginEmailSuccess = {
  success: true;
  pendingToken: string;
};

type SendLoginEmailResult =
  | RamperResponse<SendLoginEmailSuccess>
  | RamperResponse<RamperDataError>
  | RamperError;

/**
 * Sends a magic link email to the given address.
 */
export async function sendLoginEmail({
  transactionId,
  email,
}: SendLoginEmail): Promise<SendLoginEmailResult> {
  const now = new Date();
  const formatted = now.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return await ofetch<SendLoginEmailResult>(
    `${env.RAMPER_API_URL}/api/verify/email`,
    {
      method: "POST",
      body: {
        appId: env.RAMPER_APP_ID,
        email: email,
        time: formatted,
        transactionId: transactionId,
        lang: "en",
        redirectSource: `${env.RAMPER_API_URL}/`,
        isForceDefault: false,
        host: env.RAMPER_URL,
      },
      headers: {
        Origin: ORIGIN,
        Referer: ORIGIN + "/",
        "User-Agent": env.RAMPER_USERAGENT,
      },
    }
  ).catch((e) => {
    return {
      success: false,
      data: {
        success: false,
        error: getErrorMessage(e),
      },
    } satisfies RamperError;
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
  | RamperDataError;

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
      appId: env.RAMPER_APP_ID,
      transactionId,
      pendingToken,
    },
    headers: {
      Origin: ORIGIN,
      Referer: ORIGIN + "/",
      "User-Agent": env.RAMPER_USERAGENT,
    },
  }).catch((e) => {
    return {
      success: false,
      error: getErrorMessage(e),
    } satisfies RamperDataError;
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

  // login expired
  "This login attempt has expired.":
    "Login attempt expired, please try logging in again.",
};

/**
 * Maps a Ramper error to a human-readable message.
 */
export function getRamperErrorMessage(error: RamperDataError, context: string) {
  const message = errorMap[error.error];
  if (message === undefined) {
    console.error(`ramper::${context}:`, error);
    return "Ramper may be experiencing issues, please try again later.";
  }

  return message;
}
