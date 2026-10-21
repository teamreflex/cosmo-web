import { authClient } from "@/lib/client/auth";
import {
  applyUpdates,
  type Conversation,
  type ConversationUpdate,
  noConversation,
  rejoinPlan,
} from "@/lib/client/chat-conversation";
import { env } from "@/lib/env/client";
import {
  type ChatNotFound,
  ChatUnavailable,
  type StaffAccessRequired,
  Unauthorized,
} from "@apollo/chat/errors";
import { ChatAuth, ChatRpcs } from "@apollo/chat/protocol";
import { Clock, Effect, Layer, Stream } from "effect";
import { Headers } from "effect/http";
import { Atom, AtomRpc } from "effect/reactivity";
import { RpcClient, RpcMiddleware, RpcSerialization } from "effect/rpc";
import { Socket } from "effect/socket";
import { decodeJwt } from "jose";

/**
 * The viewer's chat token, shared by every call and reused until 80% of
 * its lifetime has passed, so a call never starts with one about to expire.
 * A Join refused with TokenExpired or SessionEnded drops it, so the rejoin
 * fetches a fresh one or learns the viewer is signed out.
 */
let cachedToken: { token: string; refreshAt: number } | null = null;

const currentToken = Effect.gen(function* () {
  const now = yield* Clock.currentTimeMillis;
  if (cachedToken !== null && now < cachedToken.refreshAt) {
    return cachedToken.token;
  }
  const { data, error } = yield* Effect.promise(() => authClient.token());
  if (data === null) {
    return yield* error.status === 401
      ? new Unauthorized()
      : new ChatUnavailable();
  }
  const { iat = 0, exp = 0 } = decodeJwt(data.token);
  cachedToken = { token: data.token, refreshAt: now + (exp - iat) * 800 };
  return data.token;
});

// attaches the current token to every call
const ChatAuthClient = RpcMiddleware.layerClient(
  ChatAuth,
  ({ request, next }) =>
    Effect.flatMap(currentToken, (token) =>
      next({
        ...request,
        headers: Headers.set(
          request.headers,
          "authorization",
          `Bearer ${token}`,
        ),
      }),
    ),
);

/**
 * The chat RPC client over one websocket, opened while any chat atom is
 * mounted. It only loads with the chat panel, which renders only when
 * VITE_CHAT_URL is set.
 */
export class ChatClient extends AtomRpc.Service<ChatClient>()("ChatClient", {
  group: ChatRpcs,
  protocol: RpcClient.layerProtocolSocket().pipe(
    Layer.provide(
      Socket.layerWebSocket(
        Effect.suspend(() =>
          env.VITE_CHAT_URL === undefined
            ? Effect.die("VITE_CHAT_URL is unset")
            : Effect.succeed(new URL("/rpc", env.VITE_CHAT_URL).href),
        ),
      ),
    ),
    Layer.provide(Socket.layerWebSocketConstructorGlobal),
    Layer.provide(RpcSerialization.layerJson),
    Layer.merge(ChatAuthClient),
  ),
}) {}

// why the viewer can't read the chat, which ends it for good
export type ChatEnded = Unauthorized | ChatNotFound | StaffAccessRequired;

/**
 * A trade's chat, ending for good only when the viewer can't read it; any
 * other end rejoins after the last item it saw, as rejoinPlan says. A
 * refresh (Try again) keeps what has loaded and rejoins after it at once,
 * unless the chat had ended.
 */
export const conversationAtom = Atom.family((tradeId: string) => {
  // what has loaded, which a refresh (Try again) rejoins after
  let loaded: Conversation | null = null;
  return ChatClient.runtime.atom(() => {
    const start =
      loaded === null
        ? noConversation
        : applyUpdates(loaded, [{ _tag: "Down", failures: 0 }]);
    return Stream.unwrap(
      Effect.gen(function* () {
        const client = yield* ChatClient;
        let afterId = start.items.at(-1)?.id;
        let failures = 0;

        const join = (): Stream.Stream<ConversationUpdate, ChatEnded> =>
          Stream.suspend(() =>
            client(
              "Join",
              afterId === undefined ? { tradeId } : { tradeId, afterId },
            ),
          ).pipe(
            Stream.tap((item) =>
              Effect.sync(() => {
                failures = 0;
                if (item._tag !== "CaughtUp") {
                  afterId = item.id;
                }
              }),
            ),
            Stream.catch((error) => {
              if (
                error._tag === "Unauthorized" ||
                error._tag === "ChatNotFound" ||
                error._tag === "StaffAccessRequired"
              ) {
                return Stream.fail(error);
              }
              const { fresh, quiet, wait } = rejoinPlan(error, failures);
              if (fresh) cachedToken = null;
              failures += 1;
              const rejoin = Stream.drain(
                Stream.fromEffect(Effect.sleep(wait)),
              ).pipe(Stream.concat(Stream.suspend(join)));
              return quiet
                ? rejoin
                : Stream.make({ _tag: "Down", failures } as const).pipe(
                    Stream.concat(rejoin),
                  );
            }),
          );

        return join().pipe(
          // an ended chat starts fresh on the next refresh
          Stream.tapError(() =>
            Effect.sync(() => {
              loaded = null;
            }),
          ),
          Stream.chunks,
          Stream.scan(() => start, applyUpdates),
          Stream.tap((conversation) =>
            Effect.sync(() => {
              loaded = conversation;
            }),
          ),
        );
      }),
    );
  });
});

// a message report's own copy of the message, as staff read it
export const reportedMessageAtom = Atom.family((reportId: string) =>
  ChatClient.query("ReportedMessage", { reportId }),
);
