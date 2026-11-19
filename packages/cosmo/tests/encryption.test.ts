import { describe, expect, it } from "bun:test";
import { decrypt, encrypt } from "../src/server/encryption";

// 32 bytes of 0x07, base64-encoded — fixed key for deterministic tests
const TEST_KEY = "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=";

describe("encrypt/decrypt", () => {
  it("produces a fresh IV per encryption, each decrypting to the input", () => {
    const a = encrypt("same input", TEST_KEY);
    const b = encrypt("same input", TEST_KEY);
    expect(a).not.toBe(b);
    expect(decrypt(a, TEST_KEY)).toBe("same input");
    expect(decrypt(b, TEST_KEY)).toBe("same input");
  });

  it("decrypts a known AES-256-CBC vector with a 16-byte IV prefix", () => {
    // pins the wire format: base64(iv ++ ciphertext), aes-256-cbc
    const payload = "AwMDAwMDAwMDAwMDAwMDA1spONn9hzt6oWfZj5q5C08=";
    expect(decrypt(payload, TEST_KEY)).toBe("hello apollo");
  });
});
