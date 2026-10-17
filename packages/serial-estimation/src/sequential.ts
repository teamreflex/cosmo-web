import type { ClaimBlock, ObjektSerial } from "./types";

/**
 * Serials for a digital collection, keyed by token id.
 *
 * COSMO assigns a digital objekt's token id and serial together, so serials
 * follow token-id order. Walking the collection in that order, each estimated
 * objekt gets its position plus the offset (`serial - position`) of the last
 * known serial before it: a real one from before the cutoff, or a
 * confirmation. A collection that started after the cutoff has no offset and
 * counts from #1. A claim block takes its whole width of positions as soon as
 * the walk reaches it, and its claims take their place inside it. Known
 * serials are returned as they are.
 */
export function sequentialSerials(
  objekts: readonly ObjektSerial[],
  claimBlocks: readonly ClaimBlock[],
  confirmations: ReadonlyMap<number, number>,
  cutoff: number,
): Map<number, number> {
  const ordered = [...objekts].sort((a, b) => a.tokenId - b.tokenId);
  const blocks = [...claimBlocks].sort((a, b) => a.from - b.from);
  const serials = new Map<number, number>();
  let offset = 0;
  let count = 0;
  let nextBlock = 0;

  for (const objekt of ordered) {
    // blocks at or below this token id take their positions first
    let position: number | undefined;
    for (
      let block = blocks[nextBlock];
      block !== undefined && block.from <= objekt.tokenId;
      block = blocks[++nextBlock]
    ) {
      if (objekt.tokenId <= block.to) {
        position = count + 1 + (objekt.tokenId - block.from);
      }
      count += block.to - block.from + 1;
    }
    // a claim in a block already passed sits inside it
    const passed = blocks[nextBlock - 1];
    if (
      position === undefined &&
      passed !== undefined &&
      objekt.tokenId <= passed.to
    ) {
      position = count - (passed.to - objekt.tokenId);
    }
    position ??= ++count;

    const confirmed = confirmations.get(objekt.tokenId);
    if (confirmed !== undefined) {
      serials.set(objekt.tokenId, confirmed);
      offset = confirmed - position;
    } else if (objekt.mintedAt <= cutoff) {
      serials.set(objekt.tokenId, objekt.serial);
      if (objekt.serial > 0) {
        offset = objekt.serial - position;
      }
    } else {
      serials.set(objekt.tokenId, position + offset);
    }
  }

  return serials;
}
