import { ChatRpcs } from "@apollo/chat/protocol";
import { Cause, Effect, Layer } from "effect";
import {
  HttpMiddleware,
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";
import { RpcSerialization, RpcServer } from "effect/rpc";
import { ChatConfig } from "./config";

// a socket only from the web app's own pages; every call still authenticates
const OriginCheck = HttpRouter.middleware(
  Effect.gen(function* () {
    const { allowedOrigins } = yield* ChatConfig;
    return (httpEffect) =>
      Effect.gen(function* () {
        const { headers } = yield* HttpServerRequest.HttpServerRequest;
        return allowedOrigins.includes(headers.origin ?? "")
          ? yield* httpEffect
          : HttpServerResponse.empty({ status: 403 });
      });
  }),
).layer;

/**
 * A socket's request ends when the client hangs up, which the request logger
 * reports as an InterruptError with status 499; nothing failed, so skip it.
 */
const QuietHangUp = HttpRouter.middleware((httpEffect) =>
  Effect.onError(httpEffect, (cause) =>
    Cause.hasInterruptsOnly(cause)
      ? HttpMiddleware.withLoggerDisabled(Effect.void)
      : Effect.void,
  ),
).layer;

/**
 * A response that was sent is logged at debug, which isn't printed at the
 * default minimum level, in place of the request logger's info line. Failures
 * still reach the request logger.
 */
const DebugResponseLog = HttpRouter.middleware(
  (httpEffect) =>
    Effect.gen(function* () {
      const response = yield* httpEffect;
      const { method, url } = yield* HttpServerRequest.HttpServerRequest;
      yield* Effect.logDebug("Sent HTTP response").pipe(
        Effect.annotateLogs({
          "http.method": method,
          "http.url": url,
          "http.status": response.status,
        }),
      );
      return yield* HttpMiddleware.withLoggerDisabled(Effect.succeed(response));
    }),
  { global: true },
);

/**
 * Chat's HTTP routes: the RPC websocket at /rpc, JSON over the socket and
 * behind the Origin check, and /health. Any other path is a bot probing and
 * gets a 404. main.ts serves them; the socket test serves them on a random
 * port.
 */
export const ChatRoutes = Layer.mergeAll(
  RpcServer.layerHttp({
    group: ChatRpcs,
    path: "/rpc",
    protocol: "websocket",
  }).pipe(Layer.provide([OriginCheck, QuietHangUp])),
  HttpRouter.add("GET", "/health", HttpServerResponse.text("ok")),
  HttpRouter.add("*", "*", HttpServerResponse.empty({ status: 404 })),
  DebugResponseLog,
).pipe(Layer.provide(RpcSerialization.layerJson));
