import objektAbi from "@/abi/objekt";
import comoAbi from "@/abi/como";
import { encodeFunctionData, Hex, parseEther } from "viem";

export type EncryptedWallet = {
  decryptedDek: string;
  encryptedKey: string;
  version: number;
  address: string;
};

type EncodeObjektTransfer = {
  from: string;
  to: string;
  tokenId: number;
};

/**
 * Encode custom data for objekt transfers.
 */
export function encodeObjektTransfer({
  from,
  to,
  tokenId,
}: EncodeObjektTransfer) {
  return encodeFunctionData({
    abi: objektAbi,
    functionName: "transferFrom",
    args: [from as Hex, to as Hex, BigInt(tokenId)],
  });
}

type EncodeComoTransfer = {
  contract: string;
  value: number;
  data: string;
};

/**
 * Encode custom data for COMO transfers.
 */
export function encodeComoTransfer({
  contract,
  value,
  data,
}: EncodeComoTransfer) {
  return encodeFunctionData({
    abi: comoAbi,
    functionName: "send",
    args: [contract, parseEther(value.toString()), data],
  });
}
