import { conversationAtom } from "@/lib/client/chat";
import type { ChatItem } from "@apollo/chat/items";
import { useAtomSubscribe } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useRef } from "react";
import type { ChatEvent, ChatMessage } from "./chat-rows";

type Handlers = {
  // the history the first Join replays, once it has all arrived
  onHistory?: (items: readonly ChatItem[]) => void;
  // each later message, including those caught up after a reconnect
  onMessage?: (message: ChatMessage) => void;
  // each later trade event, including those caught up after a reconnect
  onEvent?: (event: ChatEvent) => void;
};

/**
 * Calls back as a trade's chat receives things, outside of render. The
 * history is handed over whole; after it, everything this client hasn't
 * seen comes one item at a time, by id, so a reconnect's catch-up or a
 * retried Join only calls back for what's new.
 */
export function useChatArrivals(tradeId: string, handlers: Handlers) {
  // the newest id handled, null until the history has arrived
  const seen = useRef<number | null>(null);

  useAtomSubscribe(
    conversationAtom(tradeId),
    (result) => {
      if (!AsyncResult.isSuccess(result)) return;
      const { items, live } = result.value;
      const after = seen.current;
      if (after === null) {
        if (!live) return;
        handlers.onHistory?.(items);
      } else {
        for (const item of items) {
          if (item.id <= after) continue;
          if (item._tag === "Message") handlers.onMessage?.(item);
          else handlers.onEvent?.(item);
        }
      }
      // a retried Join replays the history from the start
      seen.current = Math.max(after ?? 0, items.at(-1)?.id ?? 0);
    },
    // it mounts after the Join may have started
    { immediate: true },
  );
}
