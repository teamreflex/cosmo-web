import * as clientEnv from "@/lib/env/client";
import * as serverEnv from "@/lib/env/server";
import { baseUrl } from "@/lib/utils";
import * as authSchema from "@apollo/database/auth";
import { cosmoAccounts } from "@apollo/database/web/schema";
import { GRID_COLUMNS } from "@apollo/util";
import type { CollectionDataSource } from "@apollo/util";
import { apiKey } from "@better-auth/api-key";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { parseSessionOutput, parseUserOutput } from "better-auth/db";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import { createCipheriv, randomBytes } from "node:crypto";
import type { PublicUser } from "../universal/auth";
import { settingsSchema } from "../universal/schema/auth";
import { db } from "./db";
import {
  sendAccountDeletionEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./mail.server";

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
      isAdmin: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
        returned: true,
      },
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
    isAdmin: user.isAdmin ?? false,
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
