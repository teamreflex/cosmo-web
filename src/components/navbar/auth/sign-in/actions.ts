"use server";

import { findOrCreateProfile, updateProfile } from "@/lib/server/auth";
import { setCookie } from "@/lib/server/cookies";
import { login } from "@/lib/server/cosmo/auth";
import { signToken } from "@/lib/server/jwt";
import {
  exchangeToken,
  getRamperErrorMessage,
  sendLoginEmail,
} from "@/lib/server/ramper";
import { typedAction } from "@/lib/server/typed-action";
import { ActionError } from "@/lib/server/typed-action/errors";
import { z } from "zod";

/**
 * Requests a Ramper magic link email.
 */
export const sendRamperEmail = async (form: FormData) =>
  typedAction({
    form,
    schema: z.object({
      transactionId: z.string().uuid(),
      email: z.string().email(),
    }),
    onValidate: async ({ data }) => {
      const result = await sendLoginEmail(data);

      // complete failure
      if (result.success === false) {
        console.warn(result);
        throw new ActionError({
          status: "error",
          error: getRamperErrorMessage(result.data, "sendLoginEmail"),
        });
      }

      // request failure? why is there errors in the success type?
      if (result.data.success === false) {
        console.warn(result);
        throw new ActionError({
          status: "error",
          error: getRamperErrorMessage(result.data, "sendLoginEmail"),
        });
      }

      return {
        email: data.email,
        pendingToken: result.data.pendingToken,
      };
    },
  });

/**
 * Exchanges the pendingToken from Ramper,
 * then the idToken from Ramper for a JWT from Cosmo
 */
export const exchangeRamperToken = async (form: FormData) =>
  typedAction({
    form,
    schema: z.object({
      transactionId: z.string().uuid(),
      email: z.string().email(),
      pendingToken: z.string(),
    }),
    onValidate: async ({ data: { transactionId, email, pendingToken } }) => {
      // exchange pendingToken with ramper
      const exchange = await exchangeToken({
        transactionId,
        pendingToken,
      });

      if (exchange.success === false) {
        console.warn(exchange);
        throw new ActionError({
          status: "error",
          error: getRamperErrorMessage(exchange, "exchangeToken"),
        });
      }

      // login with cosmo
      const loginResult = await login(email, exchange.ssoCredential.idToken);

      // find or create a profile for the user
      const payload = {
        userAddress: loginResult.address,
        nickname: loginResult.nickname,
        cosmoId: loginResult.id,
      };
      const profile = await findOrCreateProfile(payload);

      // update the pre-existing profile record
      if (profile.cosmoId === 0) {
        await updateProfile(profile.id, payload);
      }

      setCookie({
        key: "artist",
        value: profile.artist,
        cookie: {
          maxAge: 60 * 60 * 24 * 365, // 1 year
        },
      });

      setCookie({
        key: "token",
        value: await signToken({
          id: loginResult.id,
          nickname: loginResult.nickname,
          address: loginResult.address,
          profileId: profile.id,
          accessToken: loginResult.accessToken,
          refreshToken: loginResult.refreshToken,
        }),
      });

      return profile;
    },
    redirectTo: ({ result }) => `/@${result.nickname}`,
  });
