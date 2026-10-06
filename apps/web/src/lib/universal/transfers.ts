import type { Collection, Transfer } from "../server/db/indexer/schema";

export const transferTypes = [
  "all",
  "trade",
  "sent",
  "received",
  "mint",
  "spin",
] as const;
export type TransferType = (typeof transferTypes)[number];

export const spinOutcomes = ["success", "fail", "pending"] as const;
export type SpinOutcome = (typeof spinOutcomes)[number];

/**
 * A single transfer with the objekt it moved. Serial is null when the objekt
 * row is missing, and 0 for objekts minted after COSMO dropped serials from
 * its metadata.
 */
export type TransferObjekt = {
  transfer: Transfer;
  serial: number | null;
  collection: Collection | null;
};

export type Counterparty = {
  address: string;
  username: string | null;
};

/**
 * One row on the trades page. Transfers that belong together are folded into
 * a single row: a spin with its reward, a two-way exchange with one user, or
 * a batch sent to (or received from) one user. `id` and `timestamp` are the
 * transfer the row is listed at.
 */
export type TransferRow = { id: string; timestamp: string } & (
  | {
      kind: "spin";
      spun: TransferObjekt;
      reward: TransferObjekt | null;
      outcome: SpinOutcome;
    }
  | {
      kind: "trade";
      counterparty: Counterparty;
      sent: TransferObjekt[];
      received: TransferObjekt[];
    }
  | {
      kind: "sent" | "received";
      counterparty: Counterparty;
      objekts: TransferObjekt[];
    }
  | {
      kind: "mint";
      objekt: TransferObjekt;
    }
);

export type TransferResult = {
  results: TransferRow[];
  cursor?: string;
};
