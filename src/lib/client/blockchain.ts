import { ethers } from "ethers";
import objektAbi from "@/objekt-abi.json";
import { Interface } from "ethers/lib/utils";
import { GasStationResult } from "../server/cosmo";
import { SUPPORTED_ETHEREUM_CHAIN_IDS } from "@ramper/ethereum";

export class TransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionError";
  }
}

/**
 * Fetch the wallet's transaction count to use as a nonce.
 */
export async function fetchNonce(
  alchemy: ethers.providers.AlchemyProvider,
  address: string
) {
  try {
    return await alchemy.getTransactionCount(address);
  } catch (err) {
    console.error(err);
    throw new TransactionError("Failed to get transaction count");
  }
}

/**
 * Encode transaction data into hex using the Objekt contract ABI.
 */
export function encodeTransaction(
  fromAddress: string,
  toAddress: string,
  tokenId: string
) {
  try {
    const abi = new Interface(objektAbi);
    return abi.encodeFunctionData(abi.getFunction("transferFrom"), [
      fromAddress,
      toAddress,
      tokenId,
    ]);
  } catch (err) {
    console.error(err);
    throw new TransactionError("Failed to encode transaction");
  }
}

/**
 * Estimate the gas required for the transaction.
 */
export async function fetchGasLimit(
  alchemy: ethers.providers.AlchemyProvider,
  objektContract: string,
  transactionData: string
) {
  try {
    return await alchemy.estimateGas({
      to: objektContract,
      data: transactionData,
    });
  } catch (err) {
    console.error(err);
    throw new TransactionError("Failed to fetch gas limit");
  }
}

/**
 * Fetch the fee data from Alchemy.
 * @deprecated use the Cosmo gas station instead
 */
export async function fetchFeeData(alchemy: ethers.providers.AlchemyProvider) {
  try {
    return await alchemy.getFeeData();
  } catch (err) {
    console.error(err);
    throw new TransactionError("Failed to fetch transaction fee data");
  }
}

/**
 * Fetch gas fee prices to use from the Cosmo gas station.
 */
export async function fetchGasStation() {
  try {
    const response = await fetch(
      "https://gas-station.cosmo.fans/v1/polygon-mainnet",
      {
        cache: "no-store",
      }
    );
    if (response.ok) {
      return (await response.json()) as GasStationResult;
    }

    console.error(await response.text());
    throw new TransactionError("Failed to fetch gas station data");
  } catch (err) {
    console.error(err);
    throw new TransactionError("Failed to fetch gas station data");
  }
}

/**
 * Prompt the user to sign the transaction.
 */
export async function signTransaction(
  tokenAddress: string,
  ramperSigner: any,
  fromAddress: string,
  value: ethers.BigNumber,
  nonce: number,
  gasLimit: ethers.BigNumber,
  maxFeePerGas: ethers.BigNumber | null,
  maxPriorityFeePerGas: ethers.BigNumber | null,
  customData: string
) {
  try {
    return await ramperSigner.signTransaction({
      type: 2,
      from: fromAddress,
      to: tokenAddress,
      value,
      chainId: SUPPORTED_ETHEREUM_CHAIN_IDS.MATIC,
      nonce,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      data: customData,
    });
  } catch (err) {
    console.error(err);
    throw new TransactionError("Failed to sign transaction");
  }
}

/**
 * Submit the transaction to the blockchain.
 */
export async function sendTransaction(
  alchemy: ethers.providers.AlchemyProvider,
  signedTransaction: string
) {
  try {
    return await alchemy.sendTransaction(signedTransaction);
  } catch (err) {
    console.error(err);
    throw new TransactionError("Failed to send transaction");
  }
}
