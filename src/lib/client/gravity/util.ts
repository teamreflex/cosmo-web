// Alchemy only allows fetching 2000 blocks at a time
const MAX_BLOCK_RANGE = 2000;

type BlockChunkParams = {
  start: number;
  end: number | null;
  current: number;
  cb: (params: { fromBlock: number; toBlock: number }) => Promise<void>;
};

/**
 * Chunk into a range of blocks.
 */
export async function chunkBlocks({
  start,
  end,
  current,
  cb,
}: BlockChunkParams) {
  // if endBlock is not null, use it as the stopping point instead of currentBlock
  const stopBlock = end !== null ? end : current;

  for (
    let fromBlock = start;
    fromBlock <= stopBlock;
    fromBlock += MAX_BLOCK_RANGE
  ) {
    const toBlock = Math.min(fromBlock + MAX_BLOCK_RANGE - 1, stopBlock);
    await cb({ fromBlock, toBlock });
  }
}
