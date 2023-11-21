import { and, eq, or } from "drizzle-orm";
import { indexer } from "../db/indexer";
import { objekts, transfers } from "../db/indexer/schema";
import { TransferObjekt } from "@/lib/universal/como";

/**
 * Fetch incoming transfers for Special objekts for a given address
 */
export async function fetchSpecialTransfers(
  address: string
): Promise<TransferObjekt[]> {
  const addr = address.toLowerCase();

  const rows = await indexer
    .selectDistinctOn([transfers.tokenId], {
      transfer: transfers,
      objekt: objekts,
    })
    .from(transfers)
    .where(or(eq(transfers.to, addr), eq(transfers.from, addr)))
    .innerJoin(
      objekts,
      and(eq(transfers.objektId, objekts.id), eq(objekts.class, "Special"))
    );

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
