import { EncryptedWallet } from "./util";

/**
 * Decrypt key for use with Viem.
 */
export async function decryptMnemonic({
  decryptedDek,
  encryptedKey,
  version,
}: EncryptedWallet) {
  if (version === 3.1) {
    const derivedDek = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(decryptedDek),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    // hex
    const salt = hexToBytes(encryptedKey.substring(0, 32));
    const iv = hexToBytes(encryptedKey.substring(32, 64));
    // base64
    const encryptedBytes = base64ToBytes(encryptedKey.substring(64));

    const derivedKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-1", iterations: 1e3, salt },
      derivedDek,
      { name: "AES-CBC", length: 256 },
      false,
      ["decrypt"]
    );

    return new TextDecoder().decode(
      await crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        derivedKey,
        encryptedBytes
      )
    );
  }

  // TODO: check if version 6 is different
  const encryptedBytes = base64ToBytes(encryptedKey);
  const decryptedKey = await crypto.subtle.importKey(
    "raw",
    hexToBytes(decryptedDek),
    "AES-CBC",
    false,
    ["decrypt"]
  );

  // doesn't appear to have anything prepended
  const iv = new Uint8Array(16);

  return new TextDecoder().decode(
    hexToBytes(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: "AES-CBC", iv },
          decryptedKey,
          encryptedBytes
        )
      )
    )
  );
}

function hexToBytes(hex: string) {
  return new Uint8Array(
    hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
}

function base64ToBytes(base64: string) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
