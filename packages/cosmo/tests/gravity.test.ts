import { describe, expect, it } from "bun:test";
import { http, HttpResponse } from "msw";
import { fetchGravities, fetchGravity, fetchPoll } from "../src/server/gravity";
import { pollChoices, upcomingGravity } from "./fixtures";
import { recorder, server } from "./server";

describe("fetchGravities", () => {
  it("queries by artist and returns the full list", async () => {
    const rec = recorder();
    const list = { upcoming: [upcomingGravity], ongoing: [], past: [] };
    server.use(
      http.get(
        "https://api.cosmo.fans/bff/v3/gravities",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json(list);
        },
      ),
    );

    const result = await fetchGravities("token-123", "tripleS");

    expect(result).toEqual(list);
    const request = rec.at(0);
    expect(request.url.searchParams.get("artistId")).toBe("tripleS");
    expect(request.headers.get("authorization")).toBe("Bearer token-123");
  });
});

describe("fetchGravity", () => {
  it("unwraps the gravity object", async () => {
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/gravities/100", () =>
        HttpResponse.json({ gravity: upcomingGravity }),
      ),
    );

    expect(await fetchGravity("token-123", 100)).toEqual(upcomingGravity);
  });

  it("swallows server errors to null after one retry", async () => {
    const rec = recorder();
    server.use(
      http.get(
        "https://api.cosmo.fans/bff/v3/gravities/100",
        async ({ request }) => {
          await rec.record(request);
          return new HttpResponse(null, { status: 500 });
        },
      ),
    );

    expect(await fetchGravity("token-123", 100)).toBeNull();
    // 500 is in the retry list, so the request is attempted twice
    expect(rec.requests).toHaveLength(2);
  });

  it("swallows a 404 to null without retrying", async () => {
    const rec = recorder();
    server.use(
      http.get(
        "https://api.cosmo.fans/bff/v3/gravities/100",
        async ({ request }) => {
          await rec.record(request);
          return new HttpResponse(null, { status: 404 });
        },
      ),
    );

    expect(await fetchGravity("token-123", 100)).toBeNull();
    expect(rec.requests).toHaveLength(1);
  });
});

describe("fetchPoll", () => {
  it("unwraps the poll detail", async () => {
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/polls/7", () =>
        HttpResponse.json({ pollDetail: pollChoices }),
      ),
    );

    expect(await fetchPoll("token-123", 7)).toEqual(pollChoices);
  });

  it("rejects with the response status after retries", async () => {
    const rec = recorder();
    server.use(
      http.get("https://api.cosmo.fans/bff/v3/polls/7", async ({ request }) => {
        await rec.record(request);
        return new HttpResponse(null, { status: 500 });
      }),
    );

    expect(fetchPoll("token-123", 7)).rejects.toMatchObject({
      status: 500,
    });
    expect(rec.requests).toHaveLength(2);
  });
});
