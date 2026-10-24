import {
  canDeleteAccount,
  createDeletionToken,
  deleteAccount,
} from "@/lib/server/account-deletion.server";
import { db } from "@/lib/server/db";
import { sendAccountDeletionEmail } from "@/lib/server/mail.server";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import {
  deletionStep,
  hasDeliverableEmail,
} from "@/lib/universal/account-deletion";
import type {
  DeletionAvailability,
  RequestDeletionResult,
} from "@/lib/universal/account-deletion";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { deletionProofSchema } from "@/lib/universal/schema/account";
import { baseUrl } from "@/lib/utils";
import { createServerFn } from "@tanstack/react-start";

/**
 * Whether the caller may delete their account and how they confirm it, or
 * what blocks it.
 */
export const $checkAccountDeletion = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<DeletionAvailability> => {
    const { user, session } = context.session;
    const check = await canDeleteAccount(db, user.id);
    return check.status === "blocked"
      ? check
      : {
          status: "allowed",
          step: deletionStep(user.email, session.createdAt, new Date()),
        };
  });

/**
 * Email the caller a link to confirm their account's deletion, unless
 * something blocks it. Accounts without a deliverable email are refused; they
 * delete on a fresh session instead.
 */
export const $requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }): Promise<RequestDeletionResult> => {
    const { id: userId, email } = context.session.user;

    await consumeRateLimit({
      key: `account-deletion:${userId}`,
      limit: 3,
      window: "1 hour",
    });

    if (!hasDeliverableEmail(email)) {
      throw new ExpectedError("account_deletion_no_email");
    }

    const check = await canDeleteAccount(db, userId);
    if (check.status === "blocked") {
      return check;
    }

    const token = await createDeletionToken(userId);
    await sendAccountDeletionEmail({
      to: email,
      url: `${baseUrl()}/auth/delete-account?token=${encodeURIComponent(token)}`,
      token,
    });

    return { status: "sent" };
  });

/**
 * Delete the caller's account with the token from the emailed link, or, for an
 * account without a deliverable email, on a fresh session.
 */
export const $deleteAccount = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(deletionProofSchema)
  .handler(({ data, context }) =>
    deleteAccount(
      {
        userId: context.session.user.id,
        sessionCreatedAt: context.session.session.createdAt,
      },
      data,
    ),
  );
