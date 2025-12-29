import { Addresses } from "@apollo/util";
import {
  type BlockHeader,
  type DataHandlerContext,
  EvmBatchProcessor,
  type EvmBatchProcessorFields,
  type Log as _Log,
  type Transaction as _Transaction,
} from "@subsquid/evm-processor";
import * as ABI_COMO from "./abi/como";
import * as ABI_GRAVITY from "./abi/gravity";
import * as ABI_OBJEKT from "./abi/objekt";
import { env } from "./env";

const COSMO_START_BLOCK = 6363806;

console.log(
  `[processor] Starting processor with objekts ${env.ENABLE_OBJEKTS} and gravity ${env.ENABLE_GRAVITY}`,
);

const processor = new EvmBatchProcessor()
  .setGateway(env.SQD_ENDPOINT)
  .setRpcEndpoint({
    url: env.RPC_ENDPOINT,
    rateLimit: env.RPC_RATE_LIMIT,
  })
  .setFields({
    log: {
      topics: true,
      data: true,
      transactionHash: true,
    },
    transaction: {
      input: true,
      sighash: true,
    },
  })
  .setFinalityConfirmation(env.RPC_FINALITY);

processor
  // objekt transfers
  .addLog({
    address: [Addresses.OBJEKT],
    topic0: [ABI_OBJEKT.events.Transfer.topic],
    range: { from: COSMO_START_BLOCK },
  })
  // objekt transferability updates
  .addTransaction({
    to: [Addresses.OBJEKT],
    sighash: [ABI_OBJEKT.functions.batchUpdateObjektTransferability.sighash],
    range: { from: COSMO_START_BLOCK },
  })
  // single como transfers
  .addLog({
    address: [Addresses.COMO],
    topic0: [ABI_COMO.events.TransferSingle.topic],
    range: { from: COSMO_START_BLOCK },
  })
  // batch como transfers
  .addLog({
    address: [Addresses.COMO],
    topic0: [ABI_COMO.events.TransferBatch.topic],
    range: { from: COSMO_START_BLOCK },
  })
  // gravity votes
  .addLog({
    address: [Addresses.GRAVITY],
    topic0: [ABI_GRAVITY.events.Voted.topic],
    range: { from: COSMO_START_BLOCK },
  });

export { processor };
export type Fields = EvmBatchProcessorFields<typeof processor>;
export type Block = BlockHeader<Fields>;
export type Log = _Log<Fields>;
export type Transaction = _Transaction<Fields>;
export type ProcessorContext<Store> = DataHandlerContext<Store, Fields>;
