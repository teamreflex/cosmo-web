import { env } from "@/lib/env/server";
import { ofetch } from "ofetch";

/**
 * HTTP RPC client for the Abstract RPC.
 */
export const abstract = ofetch.create({
  baseURL: env.ABSTRACT_RPC,
  method: "POST",
  retry: 1,
  retryDelay: 300,
  timeout: 5_000,
  // exclude 499/aborted so client cancellations don't loop
  retryStatusCodes: [408, 425, 429, 500, 502, 503, 504],
});
