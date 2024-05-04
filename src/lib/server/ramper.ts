import "server-only";
import { env } from "@/env.mjs";
import { ofetch } from "ofetch";

type SendLoginEmail = {
  transactionId: string;
  email: string;
};

type SendLoginEmailResult =
  | {
      success: true;
      pendingToken: string;
    }
  | {
      success: false;
      error: string;
    };

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
  | {
      success: false;
      error: string;
    };

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
  });
}
