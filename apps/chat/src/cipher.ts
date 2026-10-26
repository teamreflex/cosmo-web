import { Config, Context, Data, Effect, Layer, Redacted } from "effect";

// a stored body or report copy that doesn't decrypt under the key and its trade
export class MessageUnreadable extends Data.TaggedError(
  "MessageUnreadable",
)<{}> {}

const NONCE_BYTES = 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function make(key: CryptoKey) {
  return {
    encrypt: (tradeId: string, body: Redacted.Redacted<string>) =>
      Effect.promise(async () => {
        const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
        const ciphertext = await crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv: nonce,
            additionalData: encoder.encode(tradeId),
          },
          key,
          encoder.encode(Redacted.value(body)),
        );
        const bytes = new Uint8Array(NONCE_BYTES + ciphertext.byteLength);
        bytes.set(nonce);
        bytes.set(new Uint8Array(ciphertext), NONCE_BYTES);
        return bytes;
      }),

    decrypt: (tradeId: string, bytes: Uint8Array) =>
      Effect.tryPromise({
        try: async () => {
          const plaintext = await crypto.subtle.decrypt(
            {
              name: "AES-GCM",
              iv: bytes.slice(0, NONCE_BYTES),
              additionalData: encoder.encode(tradeId),
            },
            key,
            bytes.slice(NONCE_BYTES),
          );
          return Redacted.make(decoder.decode(plaintext));
        },
        catch: () => new MessageUnreadable(),
      }),
  };
}

function importKey(raw: Uint8Array<ArrayBuffer>) {
  return Effect.promise(() =>
    crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]),
  );
}

/**
 * Encrypts message bodies and report copies with AES-256-GCM under
 * MESSAGE_KEY, which only chat holds. A stored body is its nonce followed by
 * the ciphertext, and the trade id is bound in as additional data, so a body
 * copied onto another trade's row fails to decrypt.
 */
export class MessageCipher extends Context.Service<
  MessageCipher,
  ReturnType<typeof make>
>()("chat/MessageCipher") {
  // MESSAGE_KEY is `openssl rand -base64 32`
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const raw = Buffer.from(
        Redacted.value(yield* Config.Redacted("MESSAGE_KEY")),
        "base64",
      );
      if (raw.byteLength !== 32) {
        return yield* Effect.die("MESSAGE_KEY must be 32 bytes of base64");
      }
      return make(yield* importKey(new Uint8Array(raw)));
    }),
  );

  // a fresh random key, for tests
  static readonly layerTest = Layer.effect(
    this,
    importKey(crypto.getRandomValues(new Uint8Array(32))).pipe(
      Effect.map(make),
    ),
  );
}
