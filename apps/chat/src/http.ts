import { ChatRpcs } from "@apollo/chat/protocol";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
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
 * Chat's HTTP routes: the RPC websocket at /rpc, JSON over the socket and
 * behind the Origin check, and /health. main.ts serves them; the socket
 * test serves them on a random port.
 */
export const ChatRoutes = Layer.mergeAll(
  RpcServer.layerHttp({
    group: ChatRpcs,
    path: "/rpc",
    protocol: "websocket",
  }).pipe(Layer.provide(OriginCheck)),
  HttpRouter.add("GET", "/health", HttpServerResponse.text("ok")),
).pipe(Layer.provide(RpcSerialization.layerJson));
