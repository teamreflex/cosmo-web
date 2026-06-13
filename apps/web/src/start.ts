import {
  sentryGlobalFunctionMiddleware,
  sentryGlobalRequestMiddleware,
} from "@sentry/tanstackstart-react";
import { createStart } from "@tanstack/react-start";

/**
 * Global Start configuration. Sentry's middleware run first so every API route
 * request and server function invocation is wrapped for error capture, reported
 * into the @sentry/bun client initialized in instrument.ts.
 */
export const startInstance = createStart(() => ({
  requestMiddleware: [sentryGlobalRequestMiddleware],
  functionMiddleware: [sentryGlobalFunctionMiddleware],
}));
