import { describe, expect, it } from "bun:test";
import { http, HttpResponse } from "msw";
import { runCosmo } from "../src/runtime";
import { fetchArtist, fetchArtists } from "../src/server/artists";
import { artistBff, artists } from "./fixtures";
import { recorder, server } from "./server";

describe("fetchArtists", () => {
  it("sends a bearer token and returns the artist list", async () => {
    const rec = recorder();
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/artists", async ({ request }) => {
        await rec.record(request);
        return HttpResponse.json(artists);
      }),
    );

    const result = await runCosmo(fetchArtists("token-123"));

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
    server.use(
      http.get(
        "https://api.cosmo.fans/bff/v3/artists/tripleS",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json(artistBff);
        },
      ),
    );

    const result = await runCosmo(fetchArtist("token-123", "tripleS"));

    expect(result).toEqual(artistBff);
    expect(rec.at(0).headers.get("authorization")).toBe("Bearer token-123");
  });
});
