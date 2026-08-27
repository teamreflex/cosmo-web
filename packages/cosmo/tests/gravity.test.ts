import { describe, expect, it } from "bun:test";
import { fetchGravities, fetchGravity, fetchPoll } from "../src/server/gravity";
import {
  combinationPollChoices,
  pastGravity,
  pollChoices,
  upcomingGravity,
} from "./fixtures";
import { handle, recorder, runTest } from "./test-client";

describe("fetchGravities", () => {
  it("queries by artist and returns the full list", async () => {
    const rec = recorder();
    const list = { upcoming: [upcomingGravity], ongoing: [], past: [] };
    handle.get("https://api.cosmo.fans/bff/v3/gravities", (request) => {
      rec.record(request);
      return Response.json(list);
    });

    const result = await runTest(fetchGravities("token-123", "tripleS"));

    expect(result).toEqual(list);
    const request = rec.at(0);
    expect(request.url.searchParams.get("artistId")).toBe("tripleS");
    expect(request.headers.get("authorization")).toBe("Bearer token-123");
  });

  it("decodes a finalized gravity in the past list", async () => {
    const list = { upcoming: [], ongoing: [], past: [pastGravity] };
    handle.get("https://api.cosmo.fans/bff/v3/gravities", () =>
      Response.json(list),
    );

    expect(await runTest(fetchGravities("token-123", "tripleS"))).toEqual(list);
  });
});

describe("fetchGravity", () => {
  it("unwraps the gravity object", async () => {
    handle.get("https://api.cosmo.fans/bff/v3/gravities/100", () =>
      Response.json({ gravity: upcomingGravity }),
    );

    expect(await runTest(fetchGravity("token-123", 100))).toEqual(
      upcomingGravity,
    );
  });

  it("unwraps a past gravity with result and leaderboard intact", async () => {
    handle.get("https://api.cosmo.fans/bff/v3/gravities/99", () =>
      Response.json({ gravity: pastGravity }),
    );

    expect(await runTest(fetchGravity("token-123", 99))).toEqual(pastGravity);
  });

  it("rejects with the response status after one retry on server errors", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/gravities/100", (request) => {
      rec.record(request);
      return new Response(null, { status: 500 });
    });

    expect(runTest(fetchGravity("token-123", 100))).rejects.toMatchObject({
      status: 500,
    });
    // 500 is in the retry list, so the request is attempted twice
    expect(rec.requests).toHaveLength(2);
  });

  it("rejects with status 404 without retrying", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/gravities/100", (request) => {
      rec.record(request);
      return new Response(null, { status: 404 });
    });

    expect(runTest(fetchGravity("token-123", 100))).rejects.toMatchObject({
      status: 404,
    });
    expect(rec.requests).toHaveLength(1);
  });
});

describe("fetchPoll", () => {
  it("unwraps the poll detail", async () => {
    handle.get("https://api.cosmo.fans/bff/v3/polls/7", () =>
      Response.json({ pollDetail: pollChoices }),
    );

    expect(await runTest(fetchPoll("token-123", 7))).toEqual(pollChoices);
  });

  it("decodes the combination poll choices variant", async () => {
    handle.get("https://api.cosmo.fans/bff/v3/polls/9", () =>
      Response.json({ pollDetail: combinationPollChoices }),
    );

    expect(await runTest(fetchPoll("token-123", 9))).toEqual(
      combinationPollChoices,
    );
  });

  it("rejects with the response status after retries", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/polls/7", (request) => {
      rec.record(request);
      return new Response(null, { status: 500 });
    });

    expect(runTest(fetchPoll("token-123", 7))).rejects.toMatchObject({
      status: 500,
    });
    expect(rec.requests).toHaveLength(2);
  });
});
