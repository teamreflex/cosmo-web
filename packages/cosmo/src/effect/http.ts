import {
  HttpClient,
  HttpClientError,
  HttpClientRequest,
} from "@effect/platform";
import { Duration, Effect, Schedule, Schema } from "effect";
import { COSMO_ENDPOINT, validArtists } from "../types/common.js";

export const ValidArtistSchema = Schema.Literal(...validArtists);

export const bearer = (token: string) => ({
  authorization: `Bearer ${token}`,
});

const apolloHeaders = {
  "user-agent": "apollo.cafe (github.com/teamreflex/cosmo-web)",
};

// exclude 499/aborted so client cancellations don't loop
const retryStatusCodes = [408, 425, 429, 500, 502, 503, 504];

// plain ofetch's default list, kept for the metadata endpoints
const defaultRetryStatusCodes = [408, 409, 425, 429, 500, 502, 503, 504];

const withRetry =
  (statusCodes: number[], delay: Duration.DurationInput) =>
  (client: HttpClient.HttpClient) =>
    HttpClient.retry(client, {
      times: 1,
      schedule: Schedule.spaced(delay),
      while: (error) =>
        (error._tag === "RequestError" && error.reason === "Transport") ||
        (error._tag === "ResponseError" &&
          statusCodes.includes(error.response.status)),
    });

const withTimeout =
  (duration: Duration.DurationInput) => (client: HttpClient.HttpClient) =>
    HttpClient.transform(client, (effect, request) =>
      Effect.timeoutFail(effect, {
        duration,
        onTimeout: () =>
          new HttpClientError.RequestError({
            request,
            reason: "Transport",
            description: "request timed out",
          }),
      }),
    );

const setBaseRequest = (baseUrl: string, headers: Record<string, string>) =>
  HttpClient.mapRequest((request: HttpClientRequest.HttpClientRequest) =>
    request.pipe(
      HttpClientRequest.prependUrl(baseUrl),
      HttpClientRequest.setHeaders(headers),
    ),
  );

/**
 * COSMO API client without retries, for endpoints where a failure should
 * surface immediately (e.g. user lookups where a 404 is meaningful).
 */
export const cosmoNoRetryClient = Effect.map(HttpClient.HttpClient, (client) =>
  client.pipe(
    setBaseRequest(COSMO_ENDPOINT, apolloHeaders),
    withTimeout(Duration.seconds(10)),
    HttpClient.filterStatusOk,
  ),
);

/**
 * COSMO API client: 10s timeout, one retry with a 300ms delay on transient failures and the retryable status codes.
 */
export const cosmoClient = Effect.map(
  cosmoNoRetryClient,
  withRetry(retryStatusCodes, Duration.millis(300)),
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
  ),
);

/**
 * Client for the objekt metadata endpoints.
 */
export const metadataClient = Effect.map(HttpClient.HttpClient, (client) =>
  client.pipe(
    setBaseRequest(COSMO_ENDPOINT, {}),
    HttpClient.filterStatusOk,
    withRetry(defaultRetryStatusCodes, Duration.zero),
  ),
);
