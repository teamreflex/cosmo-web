import { db } from "./db";
import { Profile, profiles } from "./db/schema";
import { IdentifiedUser, PublicProfile } from "@/lib/universal/cosmo/auth";
import { isAddress } from "viem";
import { notFound } from "next/navigation";
import { baseUrl, defaultProfile } from "@/lib/utils";
import { fetchByNickname } from "./cosmo/auth";
import { FetchError } from "ofetch";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "@/env";
import { z } from "zod";
import * as authSchema from "@/lib/server/db/auth-schema";

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
  },
  advanced: {
    cookiePrefix: "apollo",
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
        input: true,
        returned: true,
        fieldName: "username",
        unique: true,
      },
      cosmoAddress: {
        type: "string",
        required: false,
        input: true,
        returned: true,
        fieldName: "cosmo_address",
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
        fieldName: "is_admin",
      },
    },
  },
});

/**
 * Fetch a profile by various identifiers.
 */
export async function fetchUserByIdentifier(
  identifier: string
): Promise<IdentifiedUser> {
  const identifierIsAddress = isAddress(identifier);

  // check db for a profile
  const profile = await fetchProfileByIdentifier(
    identifier,
    identifierIsAddress ? "userAddress" : "nickname"
  );

  if (profile) {
    return {
      profile: {
        ...parseProfile(profile),
        nickname: profile.nickname,
        isAddress: identifierIsAddress,
      },
      objektLists: profile.lists,
      lockedObjekts: profile.lockedObjekts.map((row) => row.tokenId),
      pins: profile.pins,
    };
  }

  // if no profile and it's an address, return it
  if (identifierIsAddress) {
    return {
      profile: {
        ...defaultProfile,
        nickname: identifier.substring(0, 6),
        address: identifier,
      },
      objektLists: [],
      lockedObjekts: [],
      pins: [],
    };
  }

  // fetch from cosmo while it exists...
  try {
    const profile = await fetchByNickname(identifier);

    // upsert profile
    await db
      .insert(profiles)
      .values({
        userAddress: profile.address,
        nickname: profile.nickname,
        cosmoId: 0,
        artist: "artms",
      })
      .onConflictDoUpdate({
        target: profiles.userAddress,
        set: {
          nickname: profile.nickname,
        },
      })
      .returning();

    return await fetchUserByIdentifier(profile.nickname);
  } catch (err) {
    if (err instanceof FetchError && err.status !== 404) {
      console.error(`[fetchUserByIdentifier] ${err.status} from COSMO`, err);
    }
    notFound();
  }
}

/**
 * Fetch a profile by ID and parse it.
 */
export async function fetchPublicProfile(id: number) {
  const result = await db.query.profiles.findFirst({
    where: { id },
  });

  return result !== undefined ? parseProfile(result) : undefined;
}

/**
 * Fetch a profile by a nickname or address.
 */
async function fetchProfileByIdentifier(
  identifier: string,
  column: "nickname" | "userAddress"
) {
  return db.query.profiles.findFirst({
    where: {
      [column]: decodeURIComponent(identifier),
    },
    with: {
      lists: true,
      lockedObjekts: {
        where: {
          locked: true,
        },
        columns: {
          tokenId: true,
        },
      },
      pins: {
        orderBy: {
          id: "desc",
        },
      },
    },
  });
}

/**
 * Convert a database profile to a more friendly type.
 */
function parseProfile(profile: Profile): PublicProfile {
  return {
    nickname: profile.nickname,
    address: profile.userAddress,
    profileImageUrl: "",
    isAddress: false,
    artist: profile.artist,
    privacy: {
      votes: profile.privacyVotes,
    },
    gridColumns: profile.gridColumns,
    isObjektEditor: profile.objektEditor,
    dataSource: profile.dataSource ?? "cosmo",
    isModhaus: profile.isModhaus,
  };
}
