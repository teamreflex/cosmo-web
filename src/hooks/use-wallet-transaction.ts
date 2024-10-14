import { Address, Hex, parseEther } from "viem";
import { useWallet } from "./use-wallet";
import { useMutation } from "@tanstack/react-query";
import { encodeObjektTransfer } from "@/lib/client/wallet/util";
import { useCallback } from "react";
import { toast } from "@/components/ui/use-toast";

type SendTransaction = {
  to: string;
  contract: string;
  calldata: string;
  value: bigint;
};

function useWalletTransaction() {
  const { wallet } = useWallet();
  const mutation = useMutation({
    mutationFn: async (params: SendTransaction) => {
      if (!wallet || !wallet.account) {
        throw new Error("Wallet is not connected");
      }

      // estimate fees per gas
      const { maxFeePerGas, maxPriorityFeePerGas } =
        await wallet.estimateFeesPerGas();

      // estimate gas
      const gas = await wallet.estimateGas({
        to: params.to as Address,
        data: params.calldata as Hex,
        maxFeePerGas,
        maxPriorityFeePerGas,
        type: "eip1559",
      });

      //0x23b872dd000000000000000000000000cab3c85ac8f4ae0153b7cf2bbf1378397890848b000000000000000000000000528fe954280e887f6d0166b82566560f812b32440000000000000000000000000000000000000000000000000000000000546ac3

      // prepare transaction
      const request = await wallet.prepareTransactionRequest({
        to: params.to as Address,
        value: params.value,
        data: params.calldata as Hex,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        type: "eip1559",
      });

      // sign transaction
      const signature = await wallet.signTransaction(request);

      // send transaction
      const transaction = await wallet.sendRawTransaction({
        serializedTransaction: signature,
      });

      // wait for receipt
      const receipt = await wallet.waitForTransactionReceipt({
        hash: transaction,
      });

      return receipt.transactionHash;
    },
  });

  return mutation;
}

type SendObjekt = {
  to: string;
  tokenId: number;
  contract: string;
};

export function useSendObjekt() {
  const { wallet } = useWallet();
  const { mutate, data, status } = useWalletTransaction();

  const send = useCallback(
    (params: SendObjekt) => {
      if (!wallet || !wallet.account) {
        toast({
          variant: "destructive",
          description: "Wallet is not connected",
        });
        return;
      }

      // encode transaction
      const calldata = encodeObjektTransfer({
        from: wallet.account.address,
        to: params.to,
        tokenId: params.tokenId,
      });

      // objekt transfers are made via the contract
      mutate({
        to: params.contract,
        contract: params.contract,
        calldata,
        value: parseEther("0.0"),
      });
    },
    [wallet, mutate]
  );

  return {
    send,
    status,
    hash: data,
  };
}
