"use server";

import { authActionClient } from "@/lib/server/server-actions";
import { auth } from "@/lib/server/auth";
import { collectionDataSources } from "@/lib/utils";
import { headers } from "next/headers";
import { z } from "zod";
import { zfd } from "zod-form-data";

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
