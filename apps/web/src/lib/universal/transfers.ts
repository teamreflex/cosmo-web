import type { Collection, Transfer } from "../server/db/indexer/schema";

export type AggregatedTransfer = {
  transfer: Transfer;
  serial: number | null;
  collection: Collection | null;
  username?: string;
  isSpin: boolean;
};

export type TransferResult = {
  results: AggregatedTransfer[];
  cursor?: string;
};

export const transferTypes = [
  "all",
  "mint",
  "received",
  "sent",
  "spin",
] as const;
export type TransferType = (typeof transferTypes)[number];
