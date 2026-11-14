import { lazyWithPreload } from "@/lib/lazy";

/**
 * The trade chat panel, which brings Effect and the RPC client with it. It has
 * its own module so the trade page can render it and the trade route's loader
 * can start its download alongside the trade.
 */
export const LazyChatPanel = lazyWithPreload(() => import("./chat-panel"));
