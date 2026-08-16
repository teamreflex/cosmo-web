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

  it("rejects with the response status after the default retry", async () => {
    const rec = recorder();
    handle.get("https://api.cosmo.fans/objekt/v1/token/1234", (request) => {
      rec.record(request);
      return new Response(null, { status: 500 });
    });

    expect(runTest(fetchMetadataV1("1234"))).rejects.toMatchObject({
      status: 500,
    });
    // plain ofetch retries GETs once on 500 by default
    expect(rec.requests).toHaveLength(2);
  });
});

describe("fetchMetadataV3", () => {
  it("fetches token metadata from the v3 endpoint", async () => {
    handle.get("https://api.cosmo.fans/bff/v3/objekts/nft-metadata/1234", () =>
      Response.json(metadataV3),
    );

    expect(await runTest(fetchMetadataV3("1234"))).toEqual(metadataV3);
  });
});
