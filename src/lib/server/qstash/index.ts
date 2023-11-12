import { env } from "@/env.mjs";
import { Receiver, Client } from "@upstash/qstash";

export const qstash = new Client({
  token: env.QSTASH_TOKEN,
});

/**
 * Verify the QStash message.
 * @param signature string | null
 * @param body string
 */
export async function verifyMessage(signature: string | null, body: string) {
  if (!signature) return false;

  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
  });

  try {
    return await receiver.verify({ signature, body });
  } catch (err) {
    return false;
  }
}
