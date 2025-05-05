import "server-only";
import { db } from "./db";
import { isAddress } from "viem";
import { CollectionDataSource, GRID_COLUMNS } from "@/lib/utils";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@/env";
import { z } from "zod";
import * as authSchema from "@/lib/server/db/auth-schema";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { PublicUser } from "../universal/auth";
import { baseUrl } from "../query-client";
import { username } from "better-auth/plugins/username";
import {
  sendAccountDeletionEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./mail";

/**
 * Better Auth server instance.
 */
export const auth = betterAuth({
  appName: env.NEXT_PUBLIC_APP_NAME,
  secret: env.BETTER_AUTH_SECRET,
  baseUrl: baseUrl(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 20,
    }),
  ],
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
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url, token }) => {
      await sendPasswordResetEmail({
        to: user.email,
        url: url,
        token: token,
      });
    },
  },
  databaseHooks: {
    account: {
      create: {
        async before(account) {
          const withEncryptedTokens = { ...account };
          if (account.accessToken) {
            const encryptedAccessToken = encryptToken(
              account.accessToken,
              env.BETTER_AUTH_SECRET
            );
            withEncryptedTokens.accessToken = encryptedAccessToken;
          }
          if (account.refreshToken) {
            const encryptedRefreshToken = encryptToken(
              account.refreshToken,
              env.BETTER_AUTH_SECRET
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
          // Query the user to get the current access and refresh tokens
          const existingAccount = await db.query.account.findFirst({
            where: {
              id: account.id,
            },
          });

          const withEncryptedTokens = { ...account };

          // Only encrypt the tokens if they have changed
          if (
            account.accessToken &&
            existingAccount?.accessToken !== account.accessToken
          ) {
            withEncryptedTokens.accessToken = encryptToken(
              account.accessToken,
              env.BETTER_AUTH_SECRET
            );
          }

          if (
            account.refreshToken &&
            existingAccount?.refreshToken !== account.refreshToken
          ) {
            withEncryptedTokens.refreshToken = encryptToken(
              account.refreshToken,
              env.BETTER_AUTH_SECRET
            );
          }

          return {
            data: withEncryptedTokens,
          };
        },
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  socialProviders: {
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    },
    twitter: {
      clientId: env.TWITTER_CLIENT_ID,
      clientSecret: env.TWITTER_CLIENT_SECRET,
    },
  },
  advanced: {
    cookiePrefix: "apollo",
  },
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url, token }) => {
        await sendAccountDeletionEmail({
          to: user.email,
          url: url,
          token: token,
        });
      },
    },
    additionalFields: {
      cosmoAddress: {
        type: "string",
        required: false,
        input: true,
        returned: true,
        validator: {
          input: z.string().refine((val) => isAddress(val), {
            message: "Not a valid COSMO address",
          }),
          output: z.string().optional(),
        },
      },
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
    },
  },
});

// should not be used in client code
export type Session = typeof auth.$Infer.Session;
export type ServerUser = Session["user"];

const ALGORITHM = "aes-256-gcm";
const AUTH_TAG_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * Encrypt a token.
 */
export function encryptToken(token: string, key: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, "hex"), iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encryptedToken = Buffer.concat([cipher.update(token), cipher.final()]);

  // concatenate the iv, encrypted text and auth tag
  return Buffer.concat([iv, encryptedToken, cipher.getAuthTag()]).toString(
    "base64"
  );
}

/**
 * Decrypt a token.
 */
export function decryptToken(encrypted: string, key: string) {
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
    "utf8"
  );
}

/**
 * Safely convert a User object to a PublicUser object.
 */
export function toPublicUser(user: ServerUser): PublicUser;
export function toPublicUser(user: undefined): undefined;
export function toPublicUser(
  user: ServerUser | undefined
): PublicUser | undefined;
export function toPublicUser(
  user: ServerUser | undefined
): PublicUser | undefined {
  if (!user) {
    return undefined;
  }

  return {
    id: user.id,
    username: user.displayUsername,
    image: user.image,
    isAdmin: user.isAdmin ?? false,
    cosmoAddress: user.cosmoAddress,
    gridColumns: user.gridColumns ?? GRID_COLUMNS,
    collectionMode: (user.collectionMode ??
      "blockchain") as CollectionDataSource,
  };
}
