import { describe, expect, it } from "bun:test";
import { fetchMetadataV1, fetchMetadataV3 } from "../src/server/metadata";
import { metadataV1, metadataV3 } from "./fixtures";
import { handle, recorder, runTest } from "./test-client";

describe("fetchMetadataV1", () => {
  it("fetches token metadata from the v1 endpoint", async () => {
    handle.get("https://api.cosmo.fans/objekt/v1/token/1234", () =>
      Response.json(metadataV1),
    );

    expect(await runTest(fetchMetadataV1("1234"))).toEqual(metadataV1);
  });

  it("keeps retrying a failing request past the client's own retry", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/objekt/v1/token/1234", (request) => {
      rec.record(request);
      // 500 is in the metadata retry list, so the client retries it once on its
      // own and the first two requests exhaust one attempt of the outer policy
      return rec.requests.length > 2
        ? Response.json(metadataV1)
        : new Response(null, { status: 500 });
    });

    expect(await runTest(fetchMetadataV1("1234"))).toEqual(metadataV1);
    expect(rec.requests).toHaveLength(3);
  });

  it("does not retry a decode failure", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/objekt/v1/token/1234", (request) => {
      rec.record(request);
      return Response.json({ nope: true });
    });

    // settled so the request count reflects a finished policy, not one still running
    const [outcome] = await Promise.allSettled([
      runTest(fetchMetadataV1("1234")),
    ]);
    expect(outcome).toMatchObject({
      status: "rejected",
      reason: { _tag: "CosmoDecodeError" },
    });
    expect(rec.requests).toHaveLength(1);
  });
});

describe("fetchMetadataV3", () => {
  it("fetches token metadata from the v3 endpoint", async () => {
    handle.get("https://api.cosmo.fans/bff/v3/objekts/nft-metadata/1234", () =>
      Response.json(metadataV3),
    );

    expect(await runTest(fetchMetadataV3("1234"))).toEqual(metadataV3);
  });

  it("keeps retrying a failing request past the client's own retry", async () => {
    const rec = recorder();
    handle.get(
      "https://api.cosmo.fans/bff/v3/objekts/nft-metadata/1234",
      (request) => {
        rec.record(request);
        // the client retries a 500 once on its own, so the first two requests
        // exhaust one attempt of the outer policy
        return rec.requests.length > 2
          ? Response.json(metadataV3)
          : new Response(null, { status: 500 });
      },
    );

    expect(await runTest(fetchMetadataV3("1234"))).toEqual(metadataV3);
    expect(rec.requests).toHaveLength(3);
  });

  it("does not retry a decode failure", async () => {
    const rec = recorder();
    handle.get(
      "https://api.cosmo.fans/bff/v3/objekts/nft-metadata/1234",
      (request) => {
        rec.record(request);
        return Response.json({ nope: true });
      },
    );

    // COSMO changing their response shape is permanent, so it must not burn
    // the whole retry window before surfacing
    // settled so the request count reflects a finished policy, not one still running
    const [outcome] = await Promise.allSettled([
      runTest(fetchMetadataV3("1234")),
    ]);
    expect(outcome).toMatchObject({
      status: "rejected",
      reason: { _tag: "CosmoDecodeError" },
    });
    expect(rec.requests).toHaveLength(1);
  });
});
