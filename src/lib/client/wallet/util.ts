import abi from "@/abi/objekt.json";
import { encodeFunctionData } from "viem";

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
    abi,
    functionName: "transferFrom",
    args: [from, to, tokenId],
  });
}
