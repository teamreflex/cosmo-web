import { describe, expect, it } from "bun:test";
import { fetchObjektSummaries } from "../src/server/collection";
import { objektSummaries } from "./fixtures";
import { handle, recorder, runTest } from "./test-client";

describe("fetchObjektSummaries", () => {
  it("sends the session cookie and filter query, unwrapping collections", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/objekt-summaries", (request) => {
      rec.record(request);
      return Response.json(objektSummaries);
    });

    const result = await runTest(
      fetchObjektSummaries({
        session: "session-token",
        artistId: "tripleS",
        className: "First",
      }),
    );

    expect(result).toEqual(objektSummaries.collections);
    const request = rec.at(0);
    expect(request.headers.get("cookie")).toBe("user-session=session-token");
    expect(request.url.searchParams.get("artistId")).toBe("tripleS");
    expect(request.url.searchParams.get("class[]")).toBe("First");
    expect(request.url.searchParams.get("order")).toBe("newest");
    expect(request.url.searchParams.get("page")).toBe("1");
    expect(request.url.searchParams.get("size")).toBe("30");
    expect(request.url.searchParams.has("season[]")).toBe(false);
  });

  it("repeats the season filter for each given season", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/bff/v3/objekt-summaries", (request) => {
      rec.record(request);
      return Response.json(objektSummaries);
    });

    await runTest(
      fetchObjektSummaries({
        session: "session-token",
        artistId: "tripleS",
        className: "Double",
        seasons: ["Cream02", "Binary02"],
      }),
    );

    const request = rec.at(0);
    expect(request.url.searchParams.getAll("season[]")).toEqual([
      "Cream02",
      "Binary02",
    ]);
  });
});
