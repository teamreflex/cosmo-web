import { and, eq, or, sql } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { objekts, transfers } from "../db/indexer/schema";
import { TransferObjekt } from "@/lib/universal/como";

const statement = indexer
  .select({
    transfer: transfers,
    objekt: objekts,
  })
  .from(transfers)
  .where(
    or(
      eq(transfers.to, sql.placeholder("address")),
      eq(transfers.from, sql.placeholder("address"))
    )
  )
  .innerJoin(
    objekts,
    and(eq(transfers.objektId, objekts.id), eq(objekts.class, "Special"))
  )
  .prepare("como-transfers");

/**
 * Fetch incoming transfers for Special objekts for a given address
 */
export async function fetchSpecialTransfers(
  address: string
): Promise<TransferObjekt[]> {
  const addr = address.toLowerCase();
  const rows = await statement.execute({ address: addr });

  return rows
    .filter((row) => !!row.objekt)
    .filter((row, i, self) => {
      const hasReceived = row.transfer.to === addr;
      const hasNotSent =
        self.findIndex(
          (s) =>
            s.transfer.from === addr &&
            s.transfer.tokenId === row.transfer.tokenId
        ) === -1;
      return hasReceived && hasNotSent;
    });
}

const list = [];
