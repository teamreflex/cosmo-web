import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins/username";
import { createAuthMiddleware } from "better-auth/api";
import { parseSessionOutput, parseUserOutput } from "better-auth/db";
import { eq } from "drizzle-orm";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { GRID_COLUMNS } from "@apollo/util";
import * as authSchema from "@apollo/database/auth";
import {
  sendAccountDeletionEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./mail";
import { cosmoAccounts } from "./db/schema";
import { db } from "./db";
import type { CollectionDataSource } from "@apollo/util";
import type { PublicUser } from "../universal/auth";
import * as serverEnv from "@/lib/env/server";
import * as clientEnv from "@/lib/env/client";
import { baseUrl } from "@/lib/utils";

export const IP_HEADER = "cf-connecting-ip";

/**
 * Better Auth server instance.
 */
export const auth = betterAuth({
  telemetry: { enabled: false },
  appName: clientEnv.env.VITE_APP_NAME,
  secret: serverEnv.env.BETTER_AUTH_SECRET,
  baseUrl: baseUrl(),
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
    tanstackStartCookies(),
  ],

  /**
   * Enable session caching in cookies.
   */
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
      refreshCache: {
        updateAge: 60, // refresh 60 seconds before expiry
      },
      strategy: "compact",
      version: "1",
    },
  },

  /**
   * Ensure IP address logging uses the correct header.
   */
  security: {
    ipAddress: {
      ipAddressHeaders: [IP_HEADER],
    },
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
        // eslint-disable-next-line @typescript-eslint/require-await
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
        async before(account) {
          // query the user to get the current access and refresh tokens
          const existing = await db.query.account.findFirst({
            where: {
              id: account.id,
            },
          });

          // ???
          if (!existing) {
            return {
              data: account,
            };
          }

          const withEncryptedTokens = { ...account };

          // only encrypt the tokens if they have changed
          if (account.accessToken && existing.accessToken) {
            const decrypted = decryptToken(
              existing.accessToken,
              serverEnv.env.BETTER_AUTH_SECRET,
            );
            if (decrypted !== account.accessToken) {
              withEncryptedTokens.accessToken = encryptToken(
                account.accessToken,
                serverEnv.env.BETTER_AUTH_SECRET,
              );
            }
          }

          if (account.refreshToken && existing.refreshToken) {
            const decrypted = decryptToken(
              existing.refreshToken,
              serverEnv.env.BETTER_AUTH_SECRET,
            );
            if (decrypted !== account.refreshToken) {
              withEncryptedTokens.refreshToken = encryptToken(
                account.refreshToken,
                serverEnv.env.BETTER_AUTH_SECRET,
              );
            }
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
    // eslint-disable-next-line @typescript-eslint/require-await
    before: createAuthMiddleware(async (ctx) => {
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
      overrideUserInfoOnSignIn: true,
      mapProfileToUser: (profile) => {
        return {
          twitter: profile.username,
        };
      },
    },
  },
  advanced: {
    cookiePrefix: "apollo",
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: "strict",
    },
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
      },
      collectionMode: {
        type: "string",
        required: false,
        defaultValue: "blockchain",
        input: true,
        returned: true,
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
 * Decrypt a token.
 */
function decryptToken(encrypted: string, key: string) {
  // convert the encrypted token to a buffer
  const encryptedBuffer = Buffer.from(encrypted, "base64");

  // pull out individual parts (iv, auth tag, encrypted text)
  const authTag = encryptedBuffer.subarray(-AUTH_TAG_LENGTH);
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const text = encryptedBuffer.subarray(IV_LENGTH, -AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, "hex"), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(text), decipher.final()]).toString(
    "utf8",
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

  return {
    id: user.id,
    username: user.displayUsername ?? undefined,
    image: user.image ?? undefined,
    isAdmin: user.isAdmin ?? false,
    gridColumns: user.gridColumns ?? GRID_COLUMNS,
    collectionMode: (user.collectionMode ??
      "blockchain") as CollectionDataSource,
    social: {
      discord: user.discord ?? undefined,
      twitter: user.twitter ?? undefined,
    },
    showSocials: user.showSocials ?? false,
  } as PublicUser;
}
