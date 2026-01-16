import { env } from "@/lib/env/server";
import { ofetch } from "ofetch";

/**
 * HTTP RPC client for the Abstract RPC.
 */
export const abstract = ofetch.create({
  baseURL: env.ABSTRACT_RPC,
  method: "POST",
  retry: 2,
  retryDelay: 500, // 500ms
});
