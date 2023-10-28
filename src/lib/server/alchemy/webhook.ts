import { env } from "@/env.mjs";

export type BaseWebhook<TType extends string, TPayload> = {
  webhookId: string;
  id: string;
  createdAt: string;
  type: TType;
  event: TPayload;
};

export type NFTActivityWebhook = BaseWebhook<
  "NFT_ACTIVITY",
  {
    network: "MATIC_MAINNET";
    activity: {
      fromAddress: string;
      toAddress: string;
      contractAddress: string;
      erc721TokenId: string;
    }[];
  }
>;

type NFTAttribute = { traitType: string; value: string };

export type NFTMetadataWebhook = BaseWebhook<
  "NFT_METADATA_UPDATE",
  {
    network: "MATIC_MAINNET";
    contractAddress: string;
    tokenId: string;
    networkId: number;
    metadataUri: string;
    updatedAt: string;
    name: string;
    imageUri: string;
    attributes: NFTAttribute[];
    rawMetadata: Record<string, string | NFTAttribute[]>;
  }
>;

/**
 * Validates the incoming webhook.
 * @param signature string
 * @param payload string
 * @param key string
 */
export async function validateWebhook(
  signature: string | null,
  payload: string,
  key: string
) {
  const encoder = new TextEncoder();
  const encodedKey = encoder.encode(key);

  try {
    const importedKey = await crypto.subtle.importKey(
      "raw",
      encodedKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    // generate the hmac signature using the imported key
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      importedKey,
      encoder.encode(payload)
    );

    // convert signature to a hexadecimal string
    const digest = Array.from(new Uint8Array(signatureBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    return signature === digest;
  } catch (err) {
    return false;
  }
}

/**
 * Parse the incoming webhook payload.
 * @param request Request
 * @param key string
 */
export async function parsePayload<T>(
  request: Request,
  key: string
): Promise<T> {
  const body = await request.text();
  const valid = await validateWebhook(
    request.headers.get("x-alchemy-signature"),
    body,
    key
  );
  if (!valid) {
    throw new WebhookError("invalid signature");
  }

  return JSON.parse(body) as T;
}

export class WebhookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookError";
  }
}
