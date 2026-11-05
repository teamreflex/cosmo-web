import { Layer } from "effect";
import { ChatAuthLive } from "./auth";
import { TradeChannels } from "./channels";
import { Disconnects } from "./disconnects";
import { HandlersLive } from "./handlers";
import { OpenStreams } from "./open-streams";

/**
 * The RPC handlers and ChatAuth over the in-process channels, disconnects and
 * open-stream counts they share, which stay in the output so main.ts can feed
 * the first two from Redis. main.ts adds the live services and the websocket;
 * tests add in-memory services and call it through RpcTest.
 */
export const ChatServerLayer = Layer.mergeAll(HandlersLive, ChatAuthLive).pipe(
  Layer.provideMerge(
    Layer.mergeAll(TradeChannels.layer, Disconnects.layer, OpenStreams.layer),
  ),
);
