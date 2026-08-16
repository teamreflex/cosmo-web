import { Data, type Schema } from "effect";
import type { HttpClientError } from "effect/unstable/http";

/**
 * HTTP failure from the COSMO API. `status` is undefined for network-level
 * failures where no response was received.
 */
export class CosmoApiError extends Data.TaggedError("CosmoApiError")<{
  readonly url: string;
  readonly status?: number | undefined;
  readonly cause: HttpClientError.HttpClientError;
}> {
  override get message() {
    return this.status === undefined
      ? `COSMO request to ${this.url} failed`
      : `COSMO request to ${this.url} failed with status ${this.status}`;
  }
}

/**
 * COSMO responded successfully but the body did not match the expected schema.
 */
export class CosmoDecodeError extends Data.TaggedError("CosmoDecodeError")<{
  readonly url: string;
  readonly cause: Schema.SchemaError;
}> {
  override get message() {
    return `Failed to decode COSMO response from ${this.url}: ${this.cause.message}`;
  }
}
