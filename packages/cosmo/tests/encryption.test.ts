import { describe, expect, it } from "bun:test";
import { decrypt, encrypt } from "../src/server/encryption";

// 32 bytes of 0x07, base64-encoded — fixed key for deterministic tests
export const TEST_KEY = "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=";

describe("encrypt/decrypt", () => {
  it("roundtrips a payload", () => {
    const payload = JSON.stringify({ refreshToken: "secret" });
    expect(decrypt(encrypt(payload, TEST_KEY), TEST_KEY)).toBe(payload);
  });

  it("produces a fresh IV per encryption", () => {
    const a = encrypt("same input", TEST_KEY);
    const b = encrypt("same input", TEST_KEY);
    expect(a).not.toBe(b);
    expect(decrypt(a, TEST_KEY)).toBe(decrypt(b, TEST_KEY));
  });

  it("decrypts a known AES-256-CBC vector with a 16-byte IV prefix", () => {
    // pins the wire format: base64(iv ++ ciphertext), aes-256-cbc
    const payload = "AwMDAwMDAwMDAwMDAwMDA1spONn9hzt6oWfZj5q5C08=";
    expect(decrypt(payload, TEST_KEY)).toBe("hello apollo");
  });

  it("throws when decrypting with the wrong key", () => {
    const otherKey = Buffer.alloc(32, 9).toString("base64");
    const payload = encrypt("hello apollo", TEST_KEY);
    expect(() => decrypt(payload, otherKey)).toThrow();
  });

  it("throws when the key is not 32 bytes", () => {
    expect(() => encrypt("hello", "dG9vLXNob3J0")).toThrow();
  });
});
