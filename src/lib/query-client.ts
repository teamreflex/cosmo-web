import { env } from "@/env";
import {
  defaultShouldDehydrateQuery,
  isServer,
  QueryClient,
} from "@tanstack/react-query";
import { hashFn } from "wagmi/query";

let browserQueryClient: QueryClient | undefined = undefined;

/**
 * Builds a new query client.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        queryKeyHashFn: hashFn,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

/**
 * Returns a singleton or builds a new client.
 */
export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

/**
 * Get the base URL for the app.
 */
export function baseUrl() {
  const scheme =
    env.NEXT_PUBLIC_VERCEL_ENV === "development" ? "http" : "https";
  return `${scheme}://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
}
