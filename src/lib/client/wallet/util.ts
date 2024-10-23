import objektAbi from "@/abi/objekt.json";
import comoAbi from "@/abi/como.json";
import { encodeFunctionData, parseEther } from "viem";

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
    args: [from, to, tokenId],
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
