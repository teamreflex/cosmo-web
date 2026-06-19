import { ExpectedError } from "@/lib/universal/errors/expected";
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
 * Ensures the user is an admin.
 */
export const adminMiddleware = createMiddleware({ type: "function" })
  .middleware([cosmoMiddleware])
  .server(async ({ next, context }) => {
    if (context.session.user.isAdmin !== true) {
      throw new ExpectedError("not_admin");
    }

    return next({
      context,
    });
  });
