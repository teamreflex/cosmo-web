import { createIsomorphicFn } from "@tanstack/react-start";
import { env as serverEnv } from "@/lib/env/server";
import { env as clientEnv } from "@/lib/env/client";

/**
 * Get the Typesense URL.
 * Uses the internal network URL for the server, and the public URL for the client.
 */
export const getTypesenseUrl = createIsomorphicFn()
  .server(() => serverEnv.INTERNAL_TYPESENSE_URL)
  .client(() => clientEnv.VITE_TYPESENSE_URL);
