import type { Permissions } from "@apollo/auth";

/**
 * Moving a COSMO link changes who an address and its reputation belong to,
 * so it sits on the admin-only tier of a role change.
 */
export const COSMO_TRANSFER_PERMISSIONS = {
  user: ["set-role"],
} satisfies Permissions;

/**
 * A linked COSMO account as the Move dialog's From search finds it. A null
 * owner username is a deleted owner.
 */
export type CosmoTransferSource = {
  address: string;
  cosmoUsername: string;
  owner: { id: string; username: string | null };
};

/**
 * A live user without a COSMO link, as the Move dialog's To search finds it.
 */
export type CosmoTransferTarget = {
  id: string;
  username: string;
};
