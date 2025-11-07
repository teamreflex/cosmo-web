import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { certifyTicket } from "@apollo/cosmo/server/qr-auth";
import { user } from "@apollo/cosmo/server/user";
import { authenticatedMiddleware } from "@/lib/server/middlewares";
import { auth } from "@/lib/server/auth";
import { linkAccount } from "@/lib/server/cosmo-accounts";
import { importObjektLists } from "@/lib/server/objekts/lists";
import { verifyCosmoSchema } from "@/lib/universal/schema/cosmo";
import { settingsSchema } from "@/lib/universal/schema/auth";

/**
 * Updates the user's settings.
 */
export const $updateSettings = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(settingsSchema)
  .handler(async ({ data }) => {
    await auth.api.updateUser({
      headers: getRequestHeaders(),
      body: {
        gridColumns: data.gridColumns,
        collectionMode: data.collectionMode,
      },
    });
  });

/**
 * Verify the user's COSMO account.
 */
export const $verifyCosmo = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(verifyCosmoSchema)
  .handler(async ({ data, context }) => {
    // send the otp and ticket to the cosmo api
    try {
      var response = await certifyTicket(data.otp, data.ticket);
    } catch (err) {
      throw new Error("Error connecting to COSMO");
    }

    // get the user-session cookie from the response
    const headers = response.headers.getSetCookie();
    let session: string | null = null;
    for (const header of headers) {
      const parts = header.split(";");
      for (const part of parts) {
        const [name, value] = part.trim().split("=");
        if (name === "user-session" && value !== undefined) {
          session = value;
          break;
        }
      }
    }

    if (!session) {
      throw new Error("Error getting webshop session");
    }

    // get user info from cosmo
    try {
      var cosmoUser = await user(session);
    } catch (err) {
      throw new Error("Error getting user from COSMO");
    }

    // update the database with the new user info
    const account = await linkAccount({
      address: cosmoUser.address,
      username: cosmoUser.nickname,
      cosmoId: cosmoUser.id,
      userId: context.session.user.id,
      polygonAddress: null,
    });

    // import any existing objekt lists
    await importObjektLists(context.session.user.id, account.address);

    throw redirect({
      to: "/@{$username}",
      params: { username: account.username },
    });
  });
