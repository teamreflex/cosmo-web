import { ExpectedError } from "@/lib/universal/errors/expected";
import { can, parseRole } from "@apollo/auth";
import type { Permissions } from "@apollo/auth";
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
