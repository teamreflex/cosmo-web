import abi from "@/abi/objekt.json";
import { encodeFunctionData } from "viem";
import { prepareTransactionRequest } from "wagmi/actions";
import { useCallback } from "react";

type EncodeTransfer = {
  from: string;
  to: string;
  tokenId: number;
};

export function useObjektTransaction() {
  /**
   * Encode the transfer calldata.
   */
  const encodeTransfer = useCallback((params: EncodeTransfer) => {
    return encodeFunctionData({
      abi,
      functionName: "transferFrom",
      args: [params.from, params.to, params.tokenId],
    });
  }, []);

  return {
    encodeTransfer,
  };
}
