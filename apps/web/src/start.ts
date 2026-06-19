import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import { createStart } from "@tanstack/react-start";
import { expectedErrorSerializationAdapter } from "./lib/universal/errors/serialization";

/**
 * Global Start configuration. Sentry's middleware run first so every API route
 * request and server function invocation is wrapped for error capture, reported
 * into the @sentry/bun client initialized in instrument.ts. The serialization
 * adapter keeps ExpectedError intact across the wire so the client can filter
 * it by marker.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [sentryGlobalRequestMiddleware],
  functionMiddleware: [sentryGlobalFunctionMiddleware],
  serializationAdapters: [expectedErrorSerializationAdapter],
}));
