import { Address, encodeAbiParameters, Hex, parseEther } from "viem";
import {
  estimateFeesPerGas,
  getTransactionCount,
  estimateGas,
  waitForTransactionReceipt,
} from "viem/actions";
import { useWallet } from "./use-wallet";
import { MutationOptions, useMutation } from "@tanstack/react-query";
import {
  encodeComoTransfer,
  encodeObjektTransfer,
} from "@/lib/client/wallet/util";
import { useCallback } from "react";
import { toast } from "@/components/ui/use-toast";
import { ofetch } from "ofetch";
import { CosmoGravityVoteCalldata } from "@/lib/universal/cosmo/gravity";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { track } from "@/lib/utils";

export const WALLET_MISSING =
  "You may need to re-sign in to connect your wallet.";

type SendTransaction = {
  to: string;
  calldata: string;
  value: bigint;
  nonce?: number;
};

function useWalletTransaction() {
  const { wallet } = useWallet();
  const mutation = useMutation({
    mutationFn: async (params: SendTransaction) => {
      if (!wallet || !wallet.account) {
        toast({
          variant: "destructive",
          description: WALLET_MISSING,
        });
        throw new Error(WALLET_MISSING);
      }

      let nonce = params.nonce;

      // get nonce if none was provided
      if (!nonce) {
        nonce = await getTransactionCount(wallet, {
          address: wallet.account.address,
        });
      }

      // estimate fees per gas
      const { maxFeePerGas, maxPriorityFeePerGas } = await estimateFeesPerGas(
        wallet
      );

      // estimate gas
      const gas = await estimateGas(wallet, {
        to: params.to as Address,
        data: params.calldata as Hex,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        type: "eip1559",
      });

      // prepare transaction
      const request = await wallet.prepareTransactionRequest({
        to: params.to as Address,
        value: params.value,
        data: params.calldata as Hex,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        type: "eip1559",
      });

      // sign transaction
      const signature = await wallet.signTransaction(request);

      // send transaction
      const transaction = await wallet.sendRawTransaction({
        serializedTransaction: signature,
      });

      // wait for receipt
      const receipt = await waitForTransactionReceipt(wallet, {
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
  nonce?: number;
  opts?: MutationOptions<Hex, Error, SendTransaction>;
};

export function useSendObjekt() {
  const { wallet } = useWallet();
  const { mutateAsync, data, status } = useWalletTransaction();

  const send = useCallback(
    async (params: SendObjekt) => {
      if (!wallet || !wallet.account) {
        throw new Error(WALLET_MISSING);
      }

      // encode transaction
      const calldata = encodeObjektTransfer({
        from: wallet.account.address,
        to: params.to,
        tokenId: params.tokenId,
      });

      // objekt transfers are made via the contract
      return await mutateAsync(
        {
          to: params.contract,
          calldata,
          value: parseEther("0.0"),
          nonce: params.nonce,
        },
        params.opts
      );
    },
    [wallet, mutateAsync]
  );

  return {
    send,
    status,
    hash: data,
  };
}

type GravityVote = {
  artist: ValidArtist;
  governorContract: string;
  comoContract: string;
  pollId: number;
  comoAmount: number;
  choiceId: string;
};

export function useGravityVote() {
  const { wallet } = useWallet();
  const { mutateAsync } = useWalletTransaction();
  const { mutate, data, status } = useMutation({
    mutationFn: async (params: GravityVote) => {
      // fabricate vote in cosmo
      const { callData: fabricatedVote } =
        await ofetch<CosmoGravityVoteCalldata>(
          `/api/gravity/v3/${params.artist}/fabricate-vote`,
          {
            method: "POST",
            body: {
              pollId: params.pollId,
              comoAmount: params.comoAmount,
              choiceId: params.choiceId,
            },
          }
        );

      // encode calldata
      const calldata = encodeComoTransfer({
        contract: params.governorContract,
        value: params.comoAmount,
        data: encodeAbiParameters(
          [
            { type: "uint256", name: "pollIdOnChain" },
            { type: "bytes32", name: "hash" },
            { type: "bytes", name: "signature" },
          ],
          [
            BigInt(fabricatedVote.pollIdOnChain),
            fabricatedVote.hash as Hex,
            fabricatedVote.signature as Hex,
          ]
        ),
      });

      // send transaction
      return await mutateAsync(
        {
          to: params.comoContract,
          calldata,
          value: 0n,
        },
        {
          onSuccess: () => {
            track("gravity-vote");
          },
        }
      );
    },
  });

  const send = useCallback(
    (params: GravityVote, opts?: MutationOptions<Hex, Error, GravityVote>) => {
      if (!wallet || !wallet.account) {
        toast({
          variant: "destructive",
          description: WALLET_MISSING,
        });
        return;
      }

      mutate(params, opts);
    },
    [wallet, mutate]
  );

  return {
    send,
    status,
    hash: data,
  };
}
