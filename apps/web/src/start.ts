import { isRedirect } from "@tanstack/react-router";
import { createMiddleware, createStart } from "@tanstack/react-start";

/**
 * temporary workaround for https://github.com/TanStack/router/issues/5372
 * TODO: remove this once the issue is fixed
 */
const tempRedirectMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const result = await next();
    if ("error" in result && isRedirect(result.error)) {
      throw result.error;
    }
    return result;
  },
);

export const startInstance = createStart(() => {
  return {
    functionMiddleware: [tempRedirectMiddleware],
  };
});
