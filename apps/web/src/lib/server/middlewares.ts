import { env } from "@/lib/env/client";
import {
  ExpectedError,
  isExpectedError,
} from "@/lib/universal/errors/expected";
import { isMaskedError, MaskedError } from "@/lib/universal/errors/masked";
import { can, parseRole } from "@apollo/auth";
import type { Permissions } from "@apollo/auth";
import { isNotFound, isRedirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { auth } from "./auth.server";
import { getCosmoAddress } from "./cosmo-accounts.server";
import { db } from "./db";

/**
 * Gives every server function of a request one session lookup to share. A
 * page render runs its server functions in-process under one request, so they
 * read the session once between them; each browser call is a request of its
 * own. The lookup runs on first use, so a request that never asks never reads.
 */
export const sessionMiddleware = createMiddleware({ type: "request" }).server(
  ({ next, request }) => {
    let session: ReturnType<typeof auth.api.getSession> | undefined;

    return next({
      context: {
        getSession: () =>
          (session ??= auth.api.getSession({ headers: request.headers })),
      },
    });
  },
);

/**
 * Keeps a genuine failure's message on the server, because Start sends the
 * message of anything a server function throws to the caller and a database
 * error's message holds its SQL. Expected errors, redirects and notFound()
 * are answers for the client and pass through; everything else leaves as a
 * MaskedError. A server function called from another one arrives already
 * masked and reported, so it passes through as it is. Listed before Sentry's
 * function middleware in start.ts so Sentry reports the original first.
 */
export const errorMaskingMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (
      isExpectedError(error) ||
      isMaskedError(error) ||
      isRedirect(error) ||
      isNotFound(error)
    ) {
      throw error;
    }
    // without Sentry, as in local development, this is the failure's only trace
    if (env.VITE_SENTRY_DSN === undefined) {
      console.error("[server function]", error);
    }
    throw new MaskedError(error);
  }
});

/**
 * Adds the current session to the context.
 */
export const authMiddleware = createMiddleware({ type: "function" })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    return next({
      context: {
        session: await context.getSession(),
      },
    });
  });

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
    const link = await getCosmoAddress(db, context.session.user.id);
    if (link.kind === "none") {
      throw new ExpectedError("cosmo_not_linked");
    }

    return next({
      context: {
        ...context,
        cosmo: { address: link.address, username: link.username },
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
