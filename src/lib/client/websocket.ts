import { Alchemy, Network, AlchemySubscription } from "alchemy-sdk";
import { env } from "@/env.mjs";

export type CreateConnection = {
  from: string;
  onResult: (transactionHash: string) => void;
};

export type TransactionResult = {
  removed: boolean;
  transaction: {
    hash: string;
    blockNumber: string | null;
  };
};

export function createConnection({ from, onResult }: CreateConnection) {
  const alchemy = new Alchemy({
    apiKey: env.NEXT_PUBLIC_ALCHEMY_KEY,
    network: Network.MATIC_MAINNET,
  });

  alchemy.ws.on(
    {
      method: AlchemySubscription.MINED_TRANSACTIONS,
      addresses: [{ from }],
      includeRemoved: true,
      hashesOnly: false,
    },
    (tx: TransactionResult) => {
      // only send the result we want
      if (tx.removed === false && tx.transaction.blockNumber !== null) {
        onResult(tx.transaction.hash);
      }
    }
  );

  return alchemy;
}
