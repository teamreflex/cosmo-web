import { Data } from "effect";

/**
 * Downloading a source image failed. `status` is undefined when no response
 * was received (timeout, network error, or an invalid URL).
 */
export class ImageFetchError extends Data.TaggedError("ImageFetchError")<{
  readonly url: string;
  readonly status?: number | undefined;
  readonly cause: unknown;
}> {
  override get message() {
    return this.status === undefined
      ? `Image download from ${this.url} failed`
      : `Image download from ${this.url} failed with status ${this.status}`;
  }
}

/**
 * Bun.Image could not decode or encode the source. The Bun.Image error code
 * (e.g. `ERR_IMAGE_DECODE_FAILED`) is on `cause`.
 */
export class ImageProcessError extends Data.TaggedError("ImageProcessError")<{
  readonly url: string;
  readonly cause: unknown;
}> {
  override get message() {
    return `Image processing for ${this.url} failed`;
  }
}

/**
 * An R2 request failed. `status` is undefined when no response was received.
 */
export class ImageStoreError extends Data.TaggedError("ImageStoreError")<{
  readonly key: string;
  readonly status?: number | undefined;
  readonly cause: unknown;
}> {
  override get message() {
    return this.status === undefined
      ? `R2 request for ${this.key} failed`
      : `R2 request for ${this.key} failed with status ${this.status}`;
  }
}
