import { HttpRouter, HttpServerResponse } from "@effect/platform";
import { Effect } from "effect";
import { Env } from "./env";
import { Proxy } from "./proxy";
import { Replay } from "./replay";

export const router = Effect.gen(function* () {
  const env = yield* Env;
  const proxy = yield* Proxy;

  const healthRoute = HttpRouter.get("/health", HttpServerResponse.text("ok"));

  if (env.mode === "record") {
    return HttpRouter.empty.pipe(
      healthRoute,
      HttpRouter.get("/height", proxy.handleHeight),
      HttpRouter.get(
        "/:fromBlock/worker",
        Effect.flatMap(HttpRouter.params, (p) =>
          proxy.handleWorkerLookup(p.fromBlock ?? ""),
        ),
      ),
      HttpRouter.post(
        "/_worker/:token",
        Effect.flatMap(HttpRouter.params, (p) =>
          proxy.handleWorkerQuery(p.token ?? ""),
        ),
      ),
      HttpRouter.post("/rpc", proxy.handleRpc),
    );
  }

  const replay = yield* Replay;
  return HttpRouter.empty.pipe(
    healthRoute,
    HttpRouter.get("/height", replay.handleHeight),
    HttpRouter.get(
      "/:fromBlock/worker",
      Effect.flatMap(HttpRouter.params, (p) =>
        replay.handleWorkerLookup(p.fromBlock ?? ""),
      ),
    ),
    HttpRouter.post(
      "/_worker/:token",
      Effect.flatMap(HttpRouter.params, (p) =>
        replay.handleWorkerQuery(p.token ?? ""),
      ),
    ),
    HttpRouter.post("/rpc", replay.handleRpc),
  );
});
