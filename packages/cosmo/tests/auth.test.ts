import { describe, expect, it } from "bun:test";
import { http, HttpResponse } from "msw";
import { refresh, refreshV3 } from "../src/server/auth";
import { decrypt, EncryptionError } from "../src/server/encryption";
import { TEST_KEY } from "./encryption.test";
import { credentials } from "./fixtures";
import { recorder, server } from "./server";

describe("refresh", () => {
  it("posts the refresh token and unwraps credentials", async () => {
    const rec = recorder();
    server.use(
      http.post(
        "https://api.cosmo.fans/auth/v1/refresh",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json({ credentials });
        },
      ),
    );

    const result = await refresh("old-refresh-token");

    expect(result).toEqual(credentials);
    expect(JSON.parse(rec.at(0).body)).toEqual({
      refreshToken: "old-refresh-token",
    });
  });
});

describe("refreshV3", () => {
  it("sends an encrypted body with the encryption headers and unwraps credentials", async () => {
    const rec = recorder();
    server.use(
      http.post(
        "https://api.cosmo.fans/bff/v3/users/refresh-access-token",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json({ credentials });
        },
      ),
    );

    const result = await refreshV3("old-refresh-token", TEST_KEY);

    expect(result).toEqual(credentials);
    const request = rec.at(0);
    expect(request.headers.get("content-type")).toBe("text/plain");
    expect(request.headers.get("x-cosmo-encrypted")).toBe("1");
    expect(JSON.parse(decrypt(request.body, TEST_KEY))).toEqual({
      refreshToken: "old-refresh-token",
    });
  });

  it("throws EncryptionError before any request when the key is invalid", async () => {
    const rec = recorder();
    server.use(
      http.post(
        "https://api.cosmo.fans/bff/v3/users/refresh-access-token",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json({ credentials });
        },
      ),
    );

    expect(
      refreshV3("old-refresh-token", "dG9vLXNob3J0"),
    ).rejects.toBeInstanceOf(EncryptionError);
    expect(rec.requests).toHaveLength(0);
  });
});
