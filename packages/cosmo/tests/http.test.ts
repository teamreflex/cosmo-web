import { describe, expect, it } from "bun:test";
import { http, HttpResponse } from "msw";
import { runCosmo } from "../src/runtime";
import { fetchArtists } from "../src/server/artists";
import { artists } from "./fixtures";
import { recorder, server } from "./server";

/**
 * Characterizes the shared `cosmo` client policy: one retry with a 300ms
 * delay, but only for statuses in [408, 425, 429, 500, 502, 503, 504].
 */
describe("cosmo client retry policy", () => {
  it("retries a 503 once and succeeds", async () => {
    const rec = recorder();
    let calls = 0;
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/artists", async ({ request }) => {
        await rec.record(request);
        calls++;
        if (calls === 1) {
          return new HttpResponse(null, { status: 503 });
        }
        return HttpResponse.json(artists);
      }),
    );

    expect(await runCosmo(fetchArtists("token-123"))).toEqual(artists);
    expect(rec.requests).toHaveLength(2);
  });

  it("gives up after the single retry", async () => {
    const rec = recorder();
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/artists", async ({ request }) => {
        await rec.record(request);
        return new HttpResponse(null, { status: 503 });
      }),
    );

    expect(runCosmo(fetchArtists("token-123"))).rejects.toMatchObject({
      status: 503,
    });
    expect(rec.requests).toHaveLength(2);
  });

  it("does not retry a 409, unlike ofetch's default status list", async () => {
    const rec = recorder();
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/artists", async ({ request }) => {
        await rec.record(request);
        return new HttpResponse(null, { status: 409 });
      }),
    );

    expect(runCosmo(fetchArtists("token-123"))).rejects.toMatchObject({
      status: 409,
    });
    expect(rec.requests).toHaveLength(1);
  });

  it("does not retry a 400", async () => {
    const rec = recorder();
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/artists", async ({ request }) => {
        await rec.record(request);
        return new HttpResponse(null, { status: 400 });
      }),
    );

    expect(runCosmo(fetchArtists("token-123"))).rejects.toMatchObject({
      status: 400,
    });
    expect(rec.requests).toHaveLength(1);
  });
});
