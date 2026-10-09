import {
  canDeleteAccount,
  createDeletionToken,
  deleteAccount,
} from "@/lib/server/account-deletion.server";
import { db } from "@/lib/server/db";
import { sendAccountDeletionEmail } from "@/lib/server/mail.server";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { consumeRateLimit } from "@/lib/server/rate-limit.server";
import type {
  DeletionCheck,
  RequestDeletionResult,
} from "@/lib/universal/account-deletion";
import { ExpectedError } from "@/lib/universal/errors/expected";
import { deleteAccountSchema } from "@/lib/universal/schema/account";
import { baseUrl } from "@/lib/utils";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

/**
 * Whether the caller may delete their account, and what blocks it if not.
 */
export const $checkAccountDeletion = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(({ context }): Promise<DeletionCheck> =>
    canDeleteAccount(db, context.session.user.id),
  );

/**
 * Email the caller a link to confirm their account's deletion, unless
 * something blocks it. Accounts without a deliverable email are refused.
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

    // X sign-ins without a confirmed email store the X username instead
    if (!z.email().safeParse(email).success) {
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
 * Delete the caller's account with the token from the emailed link.
 */
export const $deleteAccount = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(deleteAccountSchema)
  .handler(({ data, context }) =>
    deleteAccount(context.session.user.id, data.token),
  );
