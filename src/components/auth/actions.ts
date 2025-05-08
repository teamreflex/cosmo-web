"use server";

import { ActionError, authActionClient } from "@/lib/server/server-actions";
import { auth } from "@/lib/server/auth";
import { collectionDataSources } from "@/lib/utils";
import { headers } from "next/headers";
import { z } from "zod";
import { zfd } from "zod-form-data";
import { certifyTicket } from "@/lib/server/cosmo/qr-auth";
import { user } from "@/lib/server/cosmo/user";
import { linkAccount } from "@/lib/server/cosmo-accounts";

/**
 * Updates the user's settings.
 */
export const updateSettings = authActionClient
  .metadata({ actionName: "updateSettings" })
  .schema(
    zfd.formData({
      gridColumns: zfd.numeric(z.number().min(3).max(8)),
      collectionMode: zfd.text(z.enum(collectionDataSources)),
    })
  )
  .action(async ({ parsedInput }) => {
    return await auth.api.updateUser({
      headers: await headers(),
      body: {
        gridColumns: parsedInput.gridColumns,
        collectionMode: parsedInput.collectionMode,
      },
    });
  });

/**
 * Verify the user's COSMO account.
 */
export const verifyCosmo = authActionClient
  .metadata({ actionName: "verifyCosmo" })
  .schema(
    zfd.formData({
      otp: zfd.numeric(z.number()),
      ticket: zfd.text(),
    })
  )
  .action(async ({ parsedInput: { otp, ticket }, ctx }) => {
    // send the otp and ticket to the cosmo api
    try {
      var response = await certifyTicket(otp, ticket);
    } catch (err) {
      throw new ActionError("Error connecting to COSMO");
    }

    // get the user-session cookie from the response
    const headers = response.headers.getSetCookie();
    let session: string | null = null;
    for (const header of headers) {
      const parts = header.split(";");
      for (const part of parts) {
        const [name, value] = part.trim().split("=");
        if (name === "user-session") {
          session = value;
          break;
        }
      }
    }

    if (!session) {
      throw new ActionError("Error getting webshop session");
    }

    // get user info from cosmo
    try {
      var cosmoUser = await user(session);
    } catch (err) {
      throw new ActionError("Error getting user from COSMO");
    }

    // update the database with the new user info
    return await linkAccount({
      address: cosmoUser.address,
      username: cosmoUser.nickname,
      cosmoId: cosmoUser.id,
      userId: ctx.session.user.id,
    });
  });
