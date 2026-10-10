/**
 * A linked COSMO account as the Move dialog's From search finds it.
 */
export type CosmoTransferSource = {
  address: string;
  cosmoUsername: string;
  owner: { id: string; username: string };
};

/**
 * A live user without a COSMO link, as the Move dialog's To search finds it.
 */
export type CosmoTransferTarget = {
  id: string;
  username: string;
};
