import type { Collection, Objekt, Transfer } from "../server/db/indexer/schema";

export type AggregatedTransfer = {
  transfer: Transfer;
  objekt: Objekt;
  collection: Collection | null;
  nickname?: string;
};

export type TransferResult = {
  results: AggregatedTransfer[];
  count: number;
  hasNext: boolean;
  nextStartAfter?: number;
};
