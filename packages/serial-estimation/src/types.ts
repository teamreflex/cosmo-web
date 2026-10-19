/**
 * An objekt as the estimator sees it. `serial` is 0 when unknown, and
 * `mintedAt` is milliseconds since the epoch.
 */
export type ObjektSerial = {
  tokenId: number;
  serial: number;
  mintedAt: number;
};

/**
 * A range of token ids COSMO reserved ahead of minting, bounded by the online
 * mints on either side (`lo` and `hi` are those online token ids, exclusive).
 */
export type ReservedRange = {
  lo: number;
  hi: number;
};

/**
 * A reserved range as one collection sees it. `shared` is whether another
 * collection has objekts anywhere in the range, and `foreign` holds their
 * token ids between the collection's own, the only ones that change which
 * chunks it holds.
 */
export type Reservation = ReservedRange & {
  shared: boolean;
  foreign: readonly number[];
};

/**
 * An inclusive token-id range a digital collection holds as a claim block.
 */
export type ClaimBlock = {
  from: number;
  to: number;
};

/**
 * Digital collections are numbered in token-id order, counting any claim
 * blocks in full. Physical collections and QR coupon sets are numbered by
 * position inside their reservations.
 */
export type CollectionObjekts =
  | {
      kind: "sequential";
      objekts: readonly ObjektSerial[];
      claimBlocks: readonly ClaimBlock[];
    }
  | {
      kind: "reserved";
      objekts: readonly ObjektSerial[];
      reservations: readonly Reservation[];
    };

export type SerialUpdate = {
  tokenId: number;
  serial: number;
};
