import { Layer } from "effect";
import { ChatAuthLive } from "./auth";
import { TradeChannels } from "./channels";
import { Disconnects } from "./disconnects";
import { HandlersLive } from "./handlers";

/**
 * The RPC handlers and ChatAuth over the in-process channels and disconnects
 * they share, which stay in the output so main.ts can feed them from Redis.
 * main.ts adds the live services and the websocket; tests add in-memory
 * services and call it through RpcTest.
 */
export const ChatServerLayer = Layer.mergeAll(HandlersLive, ChatAuthLive).pipe(
  Layer.provideMerge(Layer.mergeAll(TradeChannels.layer, Disconnects.layer)),
);
