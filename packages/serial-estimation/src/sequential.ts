import type { ObjektSerial } from "./types";

/**
 * Serials for a digital collection, keyed by token id.
 *
 * COSMO assigns a digital objekt's token id and serial together, so serials
 * follow token-id order. Walking the collection in that order, each estimated
 * objekt gets its position plus the offset (`serial - position`) of the last
 * known serial before it: a real one from before the cutoff, or a
 * confirmation. A collection that started after the cutoff has no offset and
 * counts from #1. Known serials are returned as they are.
 */
export function sequentialSerials(
  objekts: readonly ObjektSerial[],
  confirmations: ReadonlyMap<number, number>,
  cutoff: number,
): Map<number, number> {
  const ordered = [...objekts].sort((a, b) => a.tokenId - b.tokenId);
  const serials = new Map<number, number>();
  let offset = 0;

  for (const [index, objekt] of ordered.entries()) {
    const position = index + 1;
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
