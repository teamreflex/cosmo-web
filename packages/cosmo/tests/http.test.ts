import { describe, expect, it } from "bun:test";
import { fetchArtists } from "../src/server/artists";
import { artists } from "./fixtures";
import { handle, recorder, runTest } from "./test-client";

/**
 * Characterizes the shared `cosmo` client policy: one retry with a 300ms
 * delay, but only for statuses in [408, 425, 429, 500, 502, 503, 504].
 */
describe("cosmo client retry policy", () => {
  it("retries a 503 once and succeeds", async () => {
    const rec = recorder();
    let calls = 0;
    handle.get("https://api.cosmo.fans/bff/v3/artists", (request) => {
      rec.record(request);
      calls++;
      if (calls === 1) {
        return new Response(null, { status: 503 });
      }
      return Response.json(artists);
    });

    expect(await runTest(fetchArtists("token-123"))).toEqual(artists);
    expect(rec.requests).toHaveLength(2);
  });

  it("gives up after the single retry", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/artists", (request) => {
      rec.record(request);
      return new Response(null, { status: 503 });
    });

    expect(runTest(fetchArtists("token-123"))).rejects.toMatchObject({
      status: 503,
    });
    expect(rec.requests).toHaveLength(2);
  });

  it("does not retry a 409, unlike ofetch's default status list", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/artists", (request) => {
      rec.record(request);
      return new Response(null, { status: 409 });
    });

    expect(runTest(fetchArtists("token-123"))).rejects.toMatchObject({
      status: 409,
    });
    expect(rec.requests).toHaveLength(1);
  });

  it("does not retry a 400", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/artists", (request) => {
      rec.record(request);
      return new Response(null, { status: 400 });
    });

    expect(runTest(fetchArtists("token-123"))).rejects.toMatchObject({
      status: 400,
    });
    expect(rec.requests).toHaveLength(1);
  });
});
