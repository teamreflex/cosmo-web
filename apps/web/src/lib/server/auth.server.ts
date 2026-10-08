import * as clientEnv from "@/lib/env/client";
import * as serverEnv from "@/lib/env/server";
import { baseUrl } from "@/lib/utils";
import { adminPluginOptions, parseRole, roleNames } from "@apollo/auth";
import * as authSchema from "@apollo/database/auth";
import { cosmoAccounts } from "@apollo/database/web/schema";
import type { StaffAuditDetail } from "@apollo/database/web/types";
import { GRID_COLUMNS } from "@apollo/util";
import type { CollectionDataSource } from "@apollo/util";
import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { parseSessionOutput, parseUserOutput } from "better-auth/db";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { createCipheriv, randomBytes } from "node:crypto";
import * as z from "zod";
import type { PublicUser } from "../universal/auth";
import { settingsSchema } from "../universal/schema/auth";
import { db } from "./db";
import {
  sendAccountDeletionEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./mail.server";
import { resolveUserReports } from "./reports.server";
import { recordStaffAudit } from "./staff-audit.server";
import { publishUserEvent } from "./user-events.server";

const PREVIOUS_ROLE_HEADER = "x-apollo-previous-role";

const setRoleBodySchema = z.object({
  userId: z.coerce.string(),
  role: z.enum(roleNames),
});

/**
 * Better Auth server instance.
 */
export const auth = betterAuth({
  telemetry: { enabled: false },
  appName: clientEnv.env.VITE_APP_NAME,
  secret: serverEnv.env.BETTER_AUTH_SECRET,
  baseURL: baseUrl(),
  trustedOrigins: [baseUrl()],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 20,
      usernameValidator: (str) => {
        return /^[a-zA-Z0-9]+$/.test(str);
      },
    }),
    apiKey({
      enableSessionForAPIKeys: false,
      rateLimit: { enabled: false },
      // prefix is concatenated raw, so include the separator
      defaultPrefix: "apollo_",
      // `start` (shown in the admin table) keeps the prefix + a few key chars
      startingCharactersConfig: { charactersLength: 13 },
    }),
    admin(adminPluginOptions),
    tanstackStartCookies(),
  ],

  session: {
    freshAge: 0,
  },

  /**
   * Enable email verification.
   */
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      await sendVerificationEmail({
        to: user.email,
        url: url,
        token: token,
      });
    },
  },

  /**
   * Enable email and password authentication.
   */
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 32,
    sendResetPassword: async ({ user, url, token }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url: url,
        token: token,
      });
    },
  },

  /**
   * Encrypt OAuth access and refresh tokens.
   */
  databaseHooks: {
    account: {
      create: {
        async before(account) {
          const withEncryptedTokens = { ...account };
          if (account.accessToken) {
            const encryptedAccessToken = encryptToken(
              account.accessToken,
              serverEnv.env.BETTER_AUTH_SECRET,
            );
            withEncryptedTokens.accessToken = encryptedAccessToken;
          }
          if (account.refreshToken) {
            const encryptedRefreshToken = encryptToken(
              account.refreshToken,
              serverEnv.env.BETTER_AUTH_SECRET,
            );
            withEncryptedTokens.refreshToken = encryptedRefreshToken;
          }
          return {
            data: withEncryptedTokens,
          };
        },
      },
      update: {
        /**
         * Hooks only receive the update payload: most codepaths (repeat
         * OAuth sign-in, password changes) omit `id` and carry fresh
         * plaintext tokens from the provider. The token-refresh route
         * spreads the full row, where an unrotated token is the stored
         * ciphertext — leave those as-is and encrypt everything else.
         */
        async before(account) {
          const existing = account.id
            ? await db.query.account.findFirst({
                where: { id: account.id },
              })
            : undefined;

          const withEncryptedTokens = { ...account };

          if (
            account.accessToken &&
            account.accessToken !== existing?.accessToken
          ) {
            withEncryptedTokens.accessToken = encryptToken(
              account.accessToken,
              serverEnv.env.BETTER_AUTH_SECRET,
            );
          }

          if (
            account.refreshToken &&
            account.refreshToken !== existing?.refreshToken
          ) {
            withEncryptedTokens.refreshToken = encryptToken(
              account.refreshToken,
              serverEnv.env.BETTER_AUTH_SECRET,
            );
          }

          return {
            data: withEncryptedTokens,
          };
        },
      },
    },
  },

  /**
   * Hooks to modify the context.
   */
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      /**
       * administered by admins only; prevent public usage of the routes
       */
      if (ctx.path?.startsWith("/api-key/") && (ctx.request || ctx.headers)) {
        throw new APIError("NOT_FOUND");
      }

      /**
       * Allow exactly one known role: the plugin would comma-join an array,
       * which the role CHECK rejects. The previous role is gone once the
       * update commits, so it reaches the after-hook's audit row in a request
       * header that overwrites any value the client sent.
       */
      if (ctx.path === "/admin/set-role") {
        const body = setRoleBodySchema.safeParse(ctx.body);
        if (!body.success) {
          throw new APIError("BAD_REQUEST", {
            message: `Role must be one of: ${roleNames.join(", ")}`,
          });
        }

        const target = await db.query.user.findFirst({
          where: { id: body.data.userId },
          columns: { role: true },
        });
        if (target) {
          return {
            context: {
              headers: new Headers({ [PREVIOUS_ROLE_HEADER]: target.role }),
            },
          };
        }
      }

      /**
       * Override the internal adapter to return the session and user in one query.
       */
      if (ctx.path === "/get-session") {
        return {
          context: {
            ...ctx,
            context: {
              ...ctx.context,
              internalAdapter: {
                ...ctx.context.internalAdapter,
                findSession: async (token: string) => {
                  const result = await db.query.session.findFirst({
                    where: { token },
                    with: {
                      user: true,
                    },
                  });
                  if (!result) {
                    return null;
                  }

                  const { user, ...session } = result;
                  if (!user) {
                    return null;
                  }

                  return {
                    session: parseSessionOutput(ctx.context.options, session),
                    user: parseUserOutput(ctx.context.options, user),
                  };
                },
              },
            },
          },
        };
      }
    }),

    /**
     * Audits staff actions and publishes them on `user-events`. After-hooks
     * also run when the endpoint refused the caller, and `ctx.body` is the
     * raw request body.
     */
    after: createAuthMiddleware(async (ctx) => {
      const session = ctx.context.session;
      if (isAPIError(ctx.context.returned) || !session) {
        return;
      }

      switch (ctx.path) {
        case "/admin/ban-user": {
          const { userId, banReason, banExpiresIn } = z
            .object({
              userId: z.coerce.string(),
              banReason: z.string().optional(),
              banExpiresIn: z.number().optional(),
            })
            .parse(ctx.body);
          await recordBan({
            staffId: session.user.id,
            userId,
            reportId: z.uuid().safeParse(ctx.headers?.get("x-report-id")).data,
            // the plugin treats a zero length as permanent
            detail: {
              kind: "ban",
              expiresIn: banExpiresIn || null,
              reason: banReason ?? "",
            },
          });
          return;
        }
        case "/admin/unban-user": {
          const { userId } = z
            .object({ userId: z.coerce.string() })
            .parse(ctx.body);
          await recordStaffAudit(db, {
            staffId: session.user.id,
            action: "user:unban",
            userId,
          });
          await publishUserEvent({ type: "unbanned", userId });
          return;
        }
        case "/admin/set-role": {
          const { userId, role } = setRoleBodySchema.parse(ctx.body);
          await recordStaffAudit(db, {
            staffId: session.user.id,
            action: "user:set-role",
            userId,
            detail: {
              kind: "set-role",
              from: parseRole(ctx.headers?.get(PREVIOUS_ROLE_HEADER)),
              to: role,
            },
          });
          await publishUserEvent({ type: "role-changed", userId, role });
          return;
        }
      }
    }),
  },

  socialProviders: {
    discord: {
      enabled: true,
      clientId: serverEnv.env.DISCORD_CLIENT_ID,
      clientSecret: serverEnv.env.DISCORD_CLIENT_SECRET,
      redirectURI: `${baseUrl()}/api/auth/callback/discord`,
      overrideUserInfoOnSignIn: true,
      mapProfileToUser: (profile) => {
        return {
          discord: profile.username,
        };
      },
    },
    twitter: {
      enabled: true,
      clientId: serverEnv.env.TWITTER_CLIENT_ID,
      clientSecret: serverEnv.env.TWITTER_CLIENT_SECRET,
      redirectURI: `${baseUrl()}/api/auth/callback/twitter`,
      overrideUserInfoOnSignIn: true,
      mapProfileToUser: (profile) => {
        return {
          twitter: profile.data.username,
        };
      },
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
    },
    cookiePrefix: "apollo",
  },
  user: {
    changeEmail: {
      enabled: true,
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url, token }) => {
        await sendAccountDeletionEmail({
          to: user.email,
          url: url,
          token: token,
        });
      },
      // unlink the cosmo account when the user is deleted
      afterDelete: async (user) => {
        await db
          .update(cosmoAccounts)
          .set({
            userId: null,
          })
          .where(eq(cosmoAccounts.userId, user.id));
      },
    },
    additionalFields: {
      gridColumns: {
        type: "number",
        required: false,
        defaultValue: GRID_COLUMNS,
        input: true,
        returned: true,
        // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- zod's field accessor
        validator: { input: settingsSchema.shape.gridColumns },
      },
      collectionMode: {
        type: "string",
        required: false,
        defaultValue: "blockchain",
        input: true,
        returned: true,
        // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- zod's field accessor
        validator: { input: settingsSchema.shape.collectionMode },
      },
      discord: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
        returned: true,
      },
      twitter: {
        type: "string",
        required: false,
        defaultValue: null,
        input: true,
        returned: true,
      },
      showSocials: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: true,
        returned: true,
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
});

type BanRecord = {
  staffId: string;
  userId: string;
  reportId: string | undefined;
  detail: Extract<StaffAuditDetail, { kind: "ban" }>;
};

/**
 * Audit a ban, then announce it. A ban started from a report links that
 * report and resolves every open report on the user, each with its own audit
 * row.
 */
async function recordBan({ staffId, userId, reportId, detail }: BanRecord) {
  const banExpires = await db.transaction(async (tx) => {
    /**
     * Without a length the plugin leaves `ban_expires` as it was, so a lapsed
     * earlier ban would lift this permanent one at the next sign-in.
     */
    if (detail.expiresIn === null) {
      await tx
        .update(authSchema.user)
        .set({ banExpires: null })
        .where(eq(authSchema.user.id, userId));
    }

    const target = await tx.query.user.findFirst({
      where: { id: userId },
      columns: { banExpires: true },
    });
    const linkedReport = reportId
      ? await tx.query.reports.findFirst({
          where: { id: reportId, targetType: "user", targetId: userId },
          columns: { id: true },
        })
      : undefined;

    await recordStaffAudit(tx, {
      staffId,
      action: "user:ban",
      userId,
      reportId: linkedReport?.id ?? null,
      detail,
    });
    if (linkedReport) {
      await resolveUserReports(tx, staffId, userId);
    }

    return target?.banExpires ?? null;
  });

  await publishUserEvent({
    type: "banned",
    userId,
    expiresAt: banExpires?.toISOString() ?? null,
  });
}

// should not be used in client code
type ServerUser = (typeof auth.$Infer.Session)["user"];

const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Encrypt a token.
 */
function encryptToken(token: string, key: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, "hex"), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encryptedToken = Buffer.concat([cipher.update(token), cipher.final()]);

  // concatenate the iv, encrypted text and auth tag
  return Buffer.concat([iv, encryptedToken, cipher.getAuthTag()]).toString(
    "base64",
  );
}

/**
 * Safely convert a user object for public use.
 */
export function toPublicUser(user: undefined): undefined;
export function toPublicUser(user: ServerUser): PublicUser;
export function toPublicUser(user?: ServerUser): PublicUser | undefined;
export function toPublicUser(
  user: ServerUser | undefined,
): PublicUser | undefined {
  if (!user) {
    return undefined;
  }

  // SAFETY: PublicUser is brand-typed; a cast is the only constructor
  return {
    id: user.id,
    username: user.displayUsername ?? undefined,
    image: user.image ?? undefined,
    gridColumns: user.gridColumns ?? GRID_COLUMNS,
    // SAFETY: the column only stores CollectionDataSource values
    collectionMode: (user.collectionMode ??
      "blockchain") as CollectionDataSource,
    social: {
      discord: user.showSocials ? (user.discord ?? undefined) : undefined,
      twitter: user.showSocials ? (user.twitter ?? undefined) : undefined,
    },
    showSocials: user.showSocials ?? false,
  } as PublicUser;
}
