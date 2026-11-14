import { runCosmo } from "@apollo/cosmo/runtime";
import { refreshV3 } from "@apollo/cosmo/server/auth";
import { cosmoTokens } from "@apollo/database/web/schema";
import type { CosmoToken } from "@apollo/database/web/types";
import { Effect, Schema } from "effect";
import { Jwt } from "effect/jose";
import { db } from "./db";
import { getCosmoKey } from "./encryption.server";

/**
 * Get the latest COSMO token from the database, refresh if necessary.
 */
export async function getProxiedToken(
  signal?: AbortSignal,
): Promise<CosmoToken> {
  const latestToken: CosmoToken | undefined =
    await db.query.cosmoTokens.findFirst({
      orderBy: {
        id: "desc",
      },
    });

  if (!latestToken) {
    throw new Error("Token not found");
  }

  // access token is still valid, use it as-is
  if (validateExpiry(latestToken.accessToken)) {
    return latestToken;
  }

  // operator-actionable: the dummy account needs a fresh login
  if (!validateExpiry(latestToken.refreshToken)) {
    throw new Error("Refresh token is invalid");
  }

  const key = await getCosmoKey();
  try {
    var newTokens = await runCosmo(
      refreshV3(latestToken.refreshToken, key),
      signal,
    );
  } catch (err) {
    throw new Error("Error refreshing token", { cause: err });
  }

  // create new token
  const [newToken] = await db
    .insert(cosmoTokens)
    .values({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    })
    .returning();

  if (!newToken) {
    throw new Error("Error creating token");
  }

  return newToken;
}

const Expiry = Schema.Struct({ exp: Schema.Number });

/**
 * Validate JWT expiry by checking the exp claim.
 */
function validateExpiry(token: string): boolean {
  return Jwt.decodeUnverified(token).pipe(
    Effect.flatMap(({ claims }) => Schema.decodeUnknownEffect(Expiry)(claims)),
    Effect.map(({ exp }) => exp > Date.now() / 1000),
    Effect.orElseSucceed(() => false),
    Effect.runSync,
  );
}
