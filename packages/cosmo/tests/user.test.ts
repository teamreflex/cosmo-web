import { describe, expect, it } from "bun:test";
import { http, HttpResponse } from "msw";
import { encrypt, EncryptionError } from "../src/server/encryption";
import { fetchByNickname, fetchUserProfile, search } from "../src/server/user";
import { TEST_KEY } from "./encryption.test";
import { byNickname, searchResult, userProfile } from "./fixtures";
import { recorder, server } from "./server";

describe("fetchByNickname", () => {
  it("fetches a user by nickname without auth", async () => {
    const rec = recorder();
    server.use(
      http.get(
        "https://api.cosmo.fans/bff/v3/users/by-nickname/Kairu",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json(byNickname);
        },
      ),
    );

    expect(await fetchByNickname("Kairu")).toEqual(byNickname);
    expect(rec.at(0).headers.get("authorization")).toBeNull();
  });

  it("rejects with the response status without retrying", async () => {
    const rec = recorder();
    server.use(
      http.get(
        "https://api.cosmo.fans/bff/v3/users/by-nickname/Kairu",
        async ({ request }) => {
          await rec.record(request);
          return new HttpResponse(null, { status: 500 });
        },
      ),
    );

    expect(fetchByNickname("Kairu")).rejects.toMatchObject({
      status: 500,
    });
    // retry is disabled for this endpoint, so a retryable status still gets one attempt
    expect(rec.requests).toHaveLength(1);
  });

  it("rejects with status 404 for a missing user", async () => {
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/users/by-nickname/Missing", () =>
        HttpResponse.json({ message: "not found" }, { status: 404 }),
      ),
    );

    expect(fetchByNickname("Missing")).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("search", () => {
  it("sends the term and pagination as query params", async () => {
    const rec = recorder();
    server.use(
      http.get(
        "https://api.cosmo.fans/bff/v3/users/search",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json(searchResult);
        },
      ),
    );

    const result = await search("token-123", "kai");

    expect(result).toEqual(searchResult);
    const request = rec.at(0);
    expect(request.headers.get("authorization")).toBe("Bearer token-123");
    expect(request.url.searchParams.get("nickname")).toBe("kai");
    expect(request.url.searchParams.get("skip")).toBe("0");
    expect(request.url.searchParams.get("take")).toBe("100");
  });
});

describe("fetchUserProfile", () => {
  it("decrypts the response body", async () => {
    const rec = recorder();
    server.use(
      http.get(
        "https://api.cosmo.fans/bff/v3/users/42",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.text(
            encrypt(JSON.stringify(userProfile), TEST_KEY),
          );
        },
      ),
    );

    const result = await fetchUserProfile("token-123", TEST_KEY, 42, "tripleS");

    expect(result).toEqual(userProfile);
    const request = rec.at(0);
    expect(request.headers.get("authorization")).toBe("Bearer token-123");
    expect(request.url.searchParams.get("artistId")).toBe("tripleS");
  });

  it("throws EncryptionError when the payload cannot be decrypted", async () => {
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/users/42", () =>
        HttpResponse.text("not-encrypted"),
      ),
    );

    expect(
      fetchUserProfile("token-123", TEST_KEY, 42, "tripleS"),
    ).rejects.toBeInstanceOf(EncryptionError);
  });
});
