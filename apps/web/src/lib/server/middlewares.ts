import { ExpectedError } from "@/lib/universal/errors/expected";
import { can, parseRole } from "@apollo/auth";
import type { Permissions } from "@apollo/auth";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth.server";
import { db } from "./db";

/**
 * Adds the current session to the context.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const session = await auth.api.getSession({
      headers: getRequestHeaders(),
    });

    return next({
      context: {
        session,
      },
    });
  },
);

/**
 * Ensures that the user is authenticated.
 */
export const authenticatedMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    if (!context.session) {
      throw new ExpectedError("not_signed_in");
    }

    return next({
      context: {
        session: context.session,
      },
    });
  });

/**
 * Ensures the user has a linked COSMO account.
 */
export const cosmoMiddleware = createMiddleware({ type: "function" })
  .middleware([authenticatedMiddleware])
  .server(async ({ next, context }) => {
    // fetch the user's cosmo account
    const cosmo = await db.query.cosmoAccounts.findFirst({
      where: { userId: context.session.user.id },
    });

    if (!cosmo) {
      throw new ExpectedError("cosmo_not_linked");
    }

    return next({
      context: {
        ...context,
        cosmo,
      },
    });
  });

/**
 * Ensures the user's staff role holds every requested permission. Staff don't
 * need a linked COSMO account; chain `cosmoMiddleware` after it when the
 * handler reads one.
 */
export function staffMiddleware(permissions: Permissions) {
  return createMiddleware({ type: "function" })
    .middleware([authenticatedMiddleware])
    .server(async ({ next, context }) => {
      const role = parseRole(context.session.user.role);
      if (!can(role, permissions)) {
        throw new ExpectedError("forbidden");
      }

      return next({
        context: {
          ...context,
          role,
        },
      });
    });
}
