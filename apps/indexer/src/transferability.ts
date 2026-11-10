import { Addresses } from "@apollo/util";
import * as Sentry from "@sentry/bun";
import { address, array, bool, bytes, struct } from "@subsquid/evm-codec";
import type { Store } from "@subsquid/typeorm-store";
import { func } from "./abi/abi.support";
import * as ABI_OBJEKT from "./abi/objekt";
import type { ProcessorContext } from "./processor";

/* multicall3.com deployment address */
const MULTICALL3 = "0xca11bde05977b3631167028862be2a173976ca11";

const isObjektTransferable = ABI_OBJEKT.functions.isObjektTransferable;

/** aggregate3((address,bool,bytes)[]) */
const aggregate3 = func(
  "0x82ad56cb",
  {
    calls: array(
      struct({ target: address, allowFailure: bool, callData: bytes }),
    ),
  },
  array(struct({ success: bool, returnData: bytes })),
);

/**
 * Whether each of a chunk's minted tokens is transferable, by token id. The
 * flag is set at mint and no event or metadata carries it, so it is read from
 * the objekt contract in one Multicall3 call. The read is pinned to the
 * batch's last block, whose state is what the batch commits once its
 * transferability updates are applied.
 */
export async function readTransferability(
  ctx: ProcessorContext<Store>,
  tokenIds: readonly string[],
) {
  const transferability = new Map<string, boolean>();
  const head = ctx.blocks.at(-1)?.header;
  if (tokenIds.length === 0 || head === undefined) {
    return transferability;
  }

  try {
    const results = aggregate3.decodeResult(
      await ctx._chain.client.call<string>("eth_call", [
        {
          to: MULTICALL3,
          data: aggregate3.encode({
            calls: tokenIds.map((tokenId) => ({
              target: Addresses.OBJEKT,
              allowFailure: false,
              callData: isObjektTransferable.encode({ _0: BigInt(tokenId) }),
            })),
          }),
        },
        // by hash, so a hot block is never answered from another fork
        { blockHash: head.hash, requireCanonical: true },
      ]),
    );

    for (const [index, tokenId] of tokenIds.entries()) {
      const result = results[index];
      if (result === undefined) {
        throw new Error(`no result for token ${tokenId}`);
      }
      transferability.set(
        tokenId,
        isObjektTransferable.decodeResult(result.returnData),
      );
    }
    return transferability;
  } catch (cause) {
    ctx.log.error(
      `Unable to read transferability for ${tokenIds.length} tokens at block ${head.height}: ${tokenIds.join(", ")}`,
    );

    // flush before throwing to avoid dropping queued events
    const error = new Error("transferability read failed", { cause });
    Sentry.captureException(error, {
      level: "fatal",
      fingerprint: ["indexer-transferability-read-failed"],
      tags: { failure: "transferability" },
      extra: { tokenIds, block: head.height, blockHash: head.hash },
    });
    await Sentry.flush(2000);
    throw error;
  }
}
