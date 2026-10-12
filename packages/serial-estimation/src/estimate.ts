import { SERIAL_CUTOFF } from "./cutoff";
import { reservedSerials } from "./reserved";
import { sequentialSerials } from "./sequential";
import type { CollectionObjekts, SerialUpdate } from "./types";

/**
 * The serials in one collection that should change: estimates for objekts
 * minted after the cutoff, and any confirmed serial that differs from what is
 * stored. Objekts minted before the cutoff keep their real serial.
 */
export function estimateSerials(
  collection: CollectionObjekts,
  confirmations: ReadonlyMap<number, number>,
  cutoff = SERIAL_CUTOFF,
): SerialUpdate[] {
  const serials =
    collection.kind === "sequential"
      ? sequentialSerials(collection.objekts, confirmations, cutoff)
      : reservedSerials(
          collection.objekts,
          collection.reservations,
          confirmations,
          cutoff,
        );

  return collection.objekts.flatMap((objekt) => {
    const serial = serials.get(objekt.tokenId);
    return serial === undefined || serial === objekt.serial
      ? []
      : [{ tokenId: objekt.tokenId, serial }];
  });
}
