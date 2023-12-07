import objektAbi from "@/abi/objekt.json";
import { Interface } from "ethers/lib/utils";
import { SUPPORTED_ETHEREUM_CHAIN_IDS } from "@ramper/ethereum";
import { GasStationResult } from "../universal/cosmo/objekts";
import { BigNumber, providers } from "ethers";

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
  alchemy: providers.AlchemyProvider,
  address: string
) {
  try {
    return await alchemy.getTransactionCount(address);
  } catch (err) {
    console.error(err);
    throw new TransactionError(
      "Failed to get transaction count, please try again"
    );
  }
}

/**
 * Encode transaction data into hex using the Objekt contract ABI.
 */
export function encodeObjektTransfer(
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
    throw new TransactionError("Failed to generate transfer, please try again");
  }
}

/**
 * Estimate the gas required for the transaction.
 */
export async function fetchGasLimit(
  alchemy: providers.AlchemyProvider,
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
    throw new TransactionError(
      "Failed to get gas price, please try again. The network may be congested"
    );
  }
}

/**
 * Fetch the fee data from Alchemy.
 * @deprecated use the Cosmo gas station instead
 */
export async function fetchFeeData(alchemy: providers.AlchemyProvider) {
  try {
    return await alchemy.getFeeData();
  } catch (err) {
    console.error(err);
    throw new TransactionError(
      "Failed to get gas price, please try again. The network may be congested"
    );
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
    throw new TransactionError(
      "Failed to get gas price, please try again. Cosmo may be down"
    );
  } catch (err) {
    console.error(err);
    throw new TransactionError(
      "Failed to get gas price, please try again. Cosmo may be down"
    );
  }
}

/**
 * Prompt the user to sign the transaction.
 */
export async function signTransaction(
  tokenAddress: string,
  ramperSigner: any,
  fromAddress: string,
  value: BigNumber,
  nonce: number,
  gasLimit: BigNumber,
  maxFeePerGas: BigNumber | null,
  maxPriorityFeePerGas: BigNumber | null,
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
    throw new TransactionError(
      "Confirmation window failed to open, please try again. If you are on mobile, this is a Ramper limitation and may not work"
    );
  }
}

/**
 * Submit the transaction to the blockchain.
 */
export async function sendTransaction(
  alchemy: providers.AlchemyProvider,
  signedTransaction: string
) {
  try {
    return await alchemy.sendTransaction(signedTransaction);
  } catch (err) {
    console.error(err);
    throw new TransactionError(
      "Failed to send transfer. The network may be congested"
    );
  }
}
