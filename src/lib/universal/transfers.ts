import type { Collection, Transfer } from "../server/db/indexer/schema";

export type AggregatedTransfer = {
  transfer: Transfer;
  serial: number | null;
  collection: Collection | null;
  nickname?: string;
};

export type TransferResult = {
  results: AggregatedTransfer[];
  count: number;
  hasNext: boolean;
  nextStartAfter?: number;
};
