// Alchemy only allows fetching 2000 blocks at a time
const MAX_BLOCK_RANGE = 2000;

type BlockChunkParams<T> = {
  start: number;
  end: number | null;
  current: number;
  cb: (params: { fromBlock: number; toBlock: number }) => Promise<T>;
};

/**
 * Fetch data in chunks of 2000 blocks, returning the full list of data.
 */
export async function chunkBlocks<T>({
  start,
  end,
  current,
  cb,
}: BlockChunkParams<T>) {
  // if endBlock is not null, use it as the stopping point instead of currentBlock
  const stopBlock = end !== null ? end : current;

  const list: Promise<T>[] = [];
  for (
    let fromBlock = start;
    fromBlock <= stopBlock;
    fromBlock += MAX_BLOCK_RANGE
  ) {
    const toBlock = Math.min(fromBlock + MAX_BLOCK_RANGE - 1, stopBlock);
    list.push(cb({ fromBlock, toBlock }));
  }

  return await Promise.all(list);
}
