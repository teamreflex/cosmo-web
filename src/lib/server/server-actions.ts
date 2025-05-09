import {
  createSafeActionClient,
  DEFAULT_SERVER_ERROR_MESSAGE,
} from "next-safe-action";
import { z } from "zod";
import { auth } from "./auth";
import { headers } from "next/headers";
import { db } from "./db";

export class ActionError extends Error {}

/**
 * Default action client that adds the session to the context.
 */
export const actionClient = createSafeActionClient({
  defineMetadataSchema() {
    return z.object({
      actionName: z.string(),
    });
  },
  handleServerError(e, { metadata }) {
    if (e instanceof ActionError) {
      return e.message;
    } else {
      // only log when the error is unexpected
      console.error(`[${metadata.actionName}]`, e);
    }

    return DEFAULT_SERVER_ERROR_MESSAGE;
  },
}).use(async ({ next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return next({
    ctx: {
      session,
    },
  });
});

/**
 * Action client that ensures the user is authenticated.
 */
export const authActionClient = actionClient.use(async ({ next, ctx }) => {
  if (!ctx.session) {
    throw new ActionError("Please sign-in to continue.");
  }

  return next({ ctx: { session: ctx.session } });
});

/**
 * Action client that ensures the user has a linked COSMO account.
 */
export const cosmoActionClient = authActionClient.use(async ({ next, ctx }) => {
  // fetch the user's cosmo account
  const cosmo = await db.query.cosmoAccounts.findFirst({
    where: { userId: ctx.session.user.id },
  });

  if (!cosmo) {
    throw new ActionError("Please link your COSMO account to continue.");
  }

  return next({ ctx: { ...ctx, cosmo } });
});

/**
 * Action client that ensures the user is an admin.
 */
export const adminActionClient = cosmoActionClient.use(
  async ({ next, ctx }) => {
    if (ctx.session.user.isAdmin !== true) {
      throw new ActionError("You are not authorized to perform this action.");
    }

    return next({ ctx });
  }
);
