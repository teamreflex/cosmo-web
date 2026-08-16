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
  });
});
