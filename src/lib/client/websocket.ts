import { Alchemy, Network, AlchemySubscription } from "alchemy-sdk";
import { env } from "@/env.mjs";

export type CreateConnection = {
  from: string;
  onResult: (transactionHash: string) => void;
};

export type TransactionResult = {
  jsonrpc: string;
  method: "eth_subscription";
  params?: {
    result: {
      removed: boolean;
      transaction: {
        hash: string;
        blockNumber: string | null;
      };
    };
    subscription: string;
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
      console.log(tx);
      // only send the result we want
      if (
        tx?.params?.result &&
        tx.params.result.removed === false &&
        tx.params.result.transaction.blockNumber !== null
      ) {
        console.log(tx.params.result.transaction.hash);
        onResult(tx.params.result.transaction.hash);
      }
    }
  );

  return alchemy;
}
