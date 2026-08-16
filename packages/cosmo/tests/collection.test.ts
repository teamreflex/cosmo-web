import { describe, expect, it } from "bun:test";
import { http, HttpResponse } from "msw";
import { runCosmo } from "../src/runtime";
import { fetchObjektSummaries } from "../src/server/collection";
import { objektSummaries } from "./fixtures";
import { recorder, server } from "./server";

describe("fetchObjektSummaries", () => {
  it("sends the session cookie and filter query, unwrapping collections", async () => {
    const rec = recorder();
    server.use(
      http.get(
        "https://api.cosmo.fans/bff/v3/objekt-summaries",
        async ({ request }) => {
          await rec.record(request);
          return HttpResponse.json(objektSummaries);
        },
      ),
    );

    const result = await runCosmo(
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
