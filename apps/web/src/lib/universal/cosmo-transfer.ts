/**
 * A linked COSMO account as the Move dialog's From search finds it, with the
 * id of the user it is linked to.
 */
export type CosmoTransferSource = {
  address: string;
  cosmoUsername: string;
  ownerId: string;
};

/**
 * A live user without a COSMO link, as the Move dialog's To search finds it,
 * named by their Apollo username.
 */
export type CosmoTransferTarget = {
  id: string;
  username: string;
};
