import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import {
  errorMaskingMiddleware,
  sessionMiddleware,
} from "./lib/server/middlewares";
import { expectedErrorSerializationAdapter } from "./lib/universal/errors/serialization";

/**
 * Add CSRF middleware to server functions.
 */
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

/**
 * Global Start configuration. Sentry's middleware wrap every API route request
 * and server function invocation for error capture, reported into the
 * @sentry/bun client initialized in instrument.ts. The first function
 * middleware is the outermost, so the masking middleware sits outside Sentry's
 * and replaces a genuine error only after Sentry has captured the original.
 * The serialization adapter keeps ExpectedError intact across the wire so the
 * client can filter it by marker.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [
    sentryGlobalRequestMiddleware,
    csrfMiddleware,
    sessionMiddleware,
  ],
  functionMiddleware: [errorMaskingMiddleware, sentryGlobalFunctionMiddleware],
  serializationAdapters: [expectedErrorSerializationAdapter],
}));
