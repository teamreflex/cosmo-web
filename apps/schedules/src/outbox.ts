import type { listEventOutbox } from "@apollo/database/indexer/schema";

/**
 * One `list_event_outbox` row, narrowed by type. The indexer's check
 * constraint guarantees each type's columns, so every row parses. A
 * transfer names its indexer `transfer` row, which carries the hash.
 */
export type OutboxRow =
  | {
      type: "transfer";
      id: bigint;
      tokenId: string;
      transferId: string;
      from: string;
      to: string;
      timestamp: Date;
    }
  | {
      type: "transferability";
      id: bigint;
      tokenId: string;
      transferable: boolean;
      timestamp: Date;
    };

export type RawOutboxRow = Pick<
  typeof listEventOutbox.$inferSelect,
  | "id"
  | "type"
  | "tokenId"
  | "transferId"
  | "fromAddress"
  | "toAddress"
  | "transferable"
  | "timestamp"
>;

/**
 * Narrow a raw row, or return undefined when its columns don't match its
 * type.
 */
export function parseOutboxRow(row: RawOutboxRow): OutboxRow | undefined {
  const { id, tokenId, timestamp } = row;
  switch (row.type) {
    case "transfer":
      return row.transferId === null ||
        row.fromAddress === null ||
        row.toAddress === null
        ? undefined
        : {
            type: "transfer",
            id,
            tokenId,
            transferId: row.transferId,
            from: row.fromAddress,
            to: row.toAddress,
            timestamp,
          };
    case "transferability":
      return row.transferable === null
        ? undefined
        : {
            type: "transferability",
            id,
            tokenId,
            transferable: row.transferable,
            timestamp,
          };
  }
}

/**
 * What one row does to the web DB. A transfer proves the token left the
 * sender, so its list entries, pins and binder slot go. A transferability
 * change leaves them alone.
 */
export type RowDecision = { type: "clear"; tokenId: string } | { type: "none" };

export function decideRow(row: OutboxRow): RowDecision {
  switch (row.type) {
    case "transfer":
      return { type: "clear", tokenId: row.tokenId };
    case "transferability":
      return { type: "none" };
  }
}

export type BatchPlan = {
  // the cursor's next value: the last row's id
  seq: bigint;
  // the newest chain timestamp in the batch, whether or not its row mattered
  chainTime: Date;
  // tokens whose entries, pins and binder slots are cleared, in first-seen order
  clearTokenIds: string[];
  transfers: number;
  transferabilityChanges: number;
};

/**
 * Walk a batch in id order and fold each row's decision into one plan.
 * Returns undefined for an empty batch, which leaves the cursor alone.
 */
export function planBatch(rows: readonly OutboxRow[]): BatchPlan | undefined {
  const [first] = rows;
  if (first === undefined) return undefined;

  const plan: BatchPlan = {
    seq: first.id,
    chainTime: first.timestamp,
    clearTokenIds: [],
    transfers: 0,
    transferabilityChanges: 0,
  };
  const cleared = new Set<string>();

  for (const row of rows) {
    plan.seq = row.id;
    if (row.timestamp > plan.chainTime) plan.chainTime = row.timestamp;
    if (row.type === "transfer") plan.transfers++;
    else plan.transferabilityChanges++;

    const decision = decideRow(row);
    if (decision.type === "clear" && !cleared.has(decision.tokenId)) {
      cleared.add(decision.tokenId);
      plan.clearTokenIds.push(decision.tokenId);
    }
  }

  return plan;
}
