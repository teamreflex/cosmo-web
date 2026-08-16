import { describe, expect, it } from "bun:test";
import { fetchArtist, fetchArtists } from "../src/server/artists";
import { artistBff, artists } from "./fixtures";
import { handle, recorder, runTest } from "./test-client";

describe("fetchArtists", () => {
  it("sends a bearer token and returns the artist list", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/artists", (request) => {
      rec.record(request);
      return Response.json(artists);
    });

    const result = await runTest(fetchArtists("token-123"));

    expect(result).toEqual(artists);
    const request = rec.at(0);
    expect(request.headers.get("authorization")).toBe("Bearer token-123");
    expect(request.headers.get("user-agent")).toBe(
      "apollo.cafe (github.com/teamreflex/cosmo-web)",
    );
  });
});

describe("fetchArtist", () => {
  it("fetches a single artist by name", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/artists/tripleS", (request) => {
      rec.record(request);
      return Response.json(artistBff);
    });

    const result = await runTest(fetchArtist("token-123", "tripleS"));

    expect(result).toEqual(artistBff);
    expect(rec.at(0).headers.get("authorization")).toBe("Bearer token-123");
  });
});
