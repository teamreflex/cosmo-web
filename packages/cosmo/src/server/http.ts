import { Duration, Effect, Schedule, type Schema } from "effect";
import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
} from "effect/unstable/http";
import { CosmoApiError, CosmoDecodeError } from "../errors.js";
import { COSMO_ENDPOINT } from "../types/common.js";

export const bearer = (token: string) => ({
  authorization: `Bearer ${token}`,
});

const apolloHeaders = {
  "user-agent": "apollo.cafe (github.com/teamreflex/cosmo-web)",
};

// exclude 499/aborted so client cancellations don't loop
const retryStatusCodes = [408, 425, 429, 500, 502, 503, 504];

// the metadata endpoints additionally treat 409 as retryable
const metadataRetryStatusCodes = [408, 409, 425, 429, 500, 502, 503, 504];

const withRetry =
  (statusCodes: number[], delay: Duration.Input) =>
  (client: HttpClient.HttpClient) =>
    HttpClient.retry(client, {
      times: 1,
      schedule: Schedule.spaced(delay),
      while: (error) =>
        error.reason._tag === "TransportError" ||
        (error.response !== undefined &&
          statusCodes.includes(error.response.status)),
    });

const withTimeout =
  (duration: Duration.Input) => (client: HttpClient.HttpClient) =>
    HttpClient.transform(client, (effect, request) =>
      Effect.timeoutOrElse(effect, {
        duration,
        orElse: () =>
          Effect.fail(
            new HttpClientError.HttpClientError({
              reason: new HttpClientError.TransportError({
                request,
                description: "request timed out",
              }),
            }),
          ),
      }),
    );

const setBaseRequest = (baseUrl: string, headers: Record<string, string>) =>
  HttpClient.mapRequest((request: HttpClientRequest.HttpClientRequest) =>
    request.pipe(
      HttpClientRequest.prependUrl(baseUrl),
      HttpClientRequest.setHeaders(headers),
    ),
  );

export const toApiError = (error: HttpClientError.HttpClientError) =>
  new CosmoApiError({
    url: error.request.url,
    status: error.response?.status,
    cause: error,
  });

/**
 * Map raw HttpClientError failures into the package's tagged errors. Applied
 * outermost so the retry policy still sees raw errors.
 */
const withCosmoErrors = (client: HttpClient.HttpClient) =>
  HttpClient.transformResponse(client, Effect.mapError(toApiError));

/**
 * Decode a response body against a schema, failing with the package's tagged
 * errors instead of raw SchemaError/HttpClientError.
 */
export const decodeBody =
  <A, I>(schema: Schema.Codec<A, I, never>) =>
  (response: HttpClientResponse.HttpClientResponse) =>
    HttpClientResponse.schemaBodyJson(schema)(response).pipe(
      Effect.mapError((error) =>
        error._tag === "SchemaError"
          ? new CosmoDecodeError({ url: response.request.url, cause: error })
          : toApiError(error),
      ),
    );

const cosmoApiBase = Effect.map(HttpClient.HttpClient, (client) =>
  client.pipe(
    setBaseRequest(COSMO_ENDPOINT, apolloHeaders),
    withTimeout(Duration.seconds(10)),
    HttpClient.filterStatusOk,
  ),
);

/**
 * COSMO API client without retries, for endpoints where a failure should
 * surface immediately (e.g. user lookups where a 404 is meaningful).
 * Retry is a one-way client transformation, so opting out means building
 * from the base client rather than stripping retry off `cosmoClient`.
 */
export const cosmoNoRetryClient = Effect.map(cosmoApiBase, withCosmoErrors);

/**
 * COSMO API client: 10s timeout, one retry with a 300ms delay on transient failures and the retryable status codes.
 */
export const cosmoClient = Effect.map(cosmoApiBase, (client) =>
  client.pipe(
    withRetry(retryStatusCodes, Duration.millis(300)),
    withCosmoErrors,
  ),
);

/**
 * COSMO webshop client: same policy as the API client, plus the Host/Origin headers the shop expects.
 */
export const cosmoShopClient = Effect.map(HttpClient.HttpClient, (client) =>
  client.pipe(
    setBaseRequest("https://shop.cosmo.fans", {
      ...apolloHeaders,
      host: "shop.cosmo.fans",
      origin: "https://shop.cosmo.fans",
    }),
    withTimeout(Duration.seconds(10)),
    HttpClient.filterStatusOk,
    withRetry(retryStatusCodes, Duration.millis(300)),
    withCosmoErrors,
  ),
);

/**
 * Client for the objekt metadata endpoints: no timeout, one immediate retry,
 * and 409 is retryable on top of the shared list. `apps/indexer` depends on
 * this policy.
 */
export const metadataClient = Effect.map(HttpClient.HttpClient, (client) =>
  client.pipe(
    setBaseRequest(COSMO_ENDPOINT, {}),
    HttpClient.filterStatusOk,
    withRetry(metadataRetryStatusCodes, Duration.zero),
    withCosmoErrors,
  ),
);
