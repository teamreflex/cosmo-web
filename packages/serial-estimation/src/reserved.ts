import { findRange } from "./reservations";
import type { ObjektSerial, Reservation } from "./types";

/**
 * How far from a known serial an objekt outside every known reservation can
 * still take its serial from it. Below 100 unminted ids between the two,
 * physical estimates had no misses.
 */
const LOOSE_ANCHOR_RANGE = 100;

type Anchor = { tokenId: number; serial: number };

/**
 * `reservation` is the reservation's `lo`, so chunks of one reservation can be
 * numbered against each other before the chain crosses reservations. `owned`
 * marks chunks holding at least one of the collection's objekts.
 */
type Chunk = {
  start: number;
  size: number;
  reservation: number;
  owned: boolean;
  anchors: Anchor[];
};

/**
 * COSMO reserves physical ids in 100-id chunks, and some reservations in 50s.
 * A reservation shared by several collections splits between them on 50s. A
 * width that is neither is treated as one chunk.
 */
function chunkSize(reservation: Reservation): number {
  const width = reservation.hi - reservation.lo - 1;
  if (width % 100 === 0 && !reservation.shared) {
    return 100;
  }
  if (width % 50 === 0) {
    return 50;
  }
  return width;
}

function chunkStart(reservation: Reservation, tokenId: number): number {
  const size = chunkSize(reservation);
  return (
    reservation.lo +
    1 +
    Math.floor((tokenId - reservation.lo - 1) / size) * size
  );
}

/**
 * The anchor closest to the token id, given anchors ordered by token id.
 */
function nearest(
  sorted: readonly Anchor[],
  tokenId: number,
): Anchor | undefined {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((sorted[middle]?.tokenId ?? tokenId) < tokenId) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  const before = sorted[low - 1];
  const after = sorted[low];
  if (before === undefined || after === undefined) {
    return before ?? after;
  }
  return tokenId - before.tokenId <= after.tokenId - tokenId ? before : after;
}

/**
 * The serial at a chunk's first id, agreed by most of its anchors.
 */
function anchoredStart(chunk: Chunk): number | undefined {
  const votes = new Map<number, number>();
  let winner: number | undefined;
  let most = 0;
  for (const anchor of chunk.anchors) {
    const start = anchor.serial - (anchor.tokenId - chunk.start);
    const count = (votes.get(start) ?? 0) + 1;
    votes.set(start, count);
    if (count > most) {
      most = count;
      winner = start;
    }
  }
  return winner;
}

/**
 * The first token id of each chunk in a reservation that belongs to the
 * collection. A reservation holding only this collection contributes all of
 * its chunks, scanned or not. In a shared one, the collection holds the
 * chunks it has objekts in and any unscanned chunks between them; unscanned
 * chunks next to another collection's can't be attributed.
 */
function ownChunkStarts(
  reservation: Reservation,
  owned: ReadonlySet<number>,
): number[] {
  const size = chunkSize(reservation);
  const starts: number[] = [];
  for (let start = reservation.lo + 1; start < reservation.hi; start += size) {
    starts.push(start);
  }
  if (!reservation.shared) {
    return starts;
  }

  const foreign = new Set(
    reservation.foreign.map((tokenId) => chunkStart(reservation, tokenId)),
  );
  const included: number[] = [];
  let unscanned: number[] | undefined;
  for (const start of starts) {
    if (owned.has(start)) {
      included.push(...(unscanned ?? []), start);
      unscanned = [];
    } else if (foreign.has(start)) {
      unscanned = undefined;
    } else {
      unscanned?.push(start);
    }
  }
  return included;
}

/**
 * The chunks that belong to a collection, keyed by their first token id, each
 * with the known serials inside it.
 */
function collectChunks(
  objekts: readonly ObjektSerial[],
  reservations: readonly Reservation[],
  anchors: readonly Anchor[],
): Map<number, Chunk> {
  const touched = new Map<number, Reservation>();
  const owned = new Set<number>();
  for (const objekt of objekts) {
    const reservation = findRange(reservations, objekt.tokenId);
    if (reservation !== undefined) {
      touched.set(reservation.lo, reservation);
      owned.add(chunkStart(reservation, objekt.tokenId));
    }
  }

  const chunks = new Map<number, Chunk>();
  for (const reservation of touched.values()) {
    const size = chunkSize(reservation);
    for (const start of ownChunkStarts(reservation, owned)) {
      chunks.set(start, {
        start,
        size: Math.min(size, reservation.hi - start),
        reservation: reservation.lo,
        owned: owned.has(start),
        anchors: [],
      });
    }
  }

  for (const anchor of anchors) {
    const reservation = findRange(reservations, anchor.tokenId);
    if (reservation !== undefined) {
      chunks.get(chunkStart(reservation, anchor.tokenId))?.anchors.push(anchor);
    }
  }

  return chunks;
}

/**
 * Fill unknown chunk starts from their neighbours: forward from the chunk
 * before (its start plus its size), then backward from the chunk after.
 * `linked` decides which neighbours may be chained.
 */
function chain(
  ordered: readonly Chunk[],
  starts: (number | undefined)[],
  linked: (a: Chunk, b: Chunk) => boolean,
) {
  for (let index = 1; index < ordered.length; index++) {
    const previous = ordered[index - 1];
    const chunk = ordered[index];
    const previousStart = starts[index - 1];
    if (
      starts[index] === undefined &&
      previous &&
      chunk &&
      previousStart !== undefined &&
      linked(previous, chunk)
    ) {
      starts[index] = previousStart + previous.size;
    }
  }
  for (let index = ordered.length - 2; index >= 0; index--) {
    const chunk = ordered[index];
    const next = ordered[index + 1];
    const nextStart = starts[index + 1];
    if (
      starts[index] === undefined &&
      chunk &&
      next &&
      nextStart !== undefined &&
      linked(chunk, next)
    ) {
      starts[index] = nextStart - chunk.size;
    }
  }
}

/**
 * Each chunk's first serial: from its own known serials, else chained from
 * known chunks in the same reservation, else chained across reservations.
 * Chunks of one reservation are numbered against each other first because
 * nothing can sit between them, while an unscanned reservation can sit
 * between two others. With no known serial anywhere, #1 is the first chunk
 * with a scan in it: a reservation's leading chunks are often another print
 * run nobody has scanned.
 */
function chunkStarts(chunks: ReadonlyMap<number, Chunk>): Map<number, number> {
  const ordered = [...chunks.values()].sort((a, b) => a.start - b.start);
  const starts = ordered.map(anchoredStart);
  const any = () => true;

  chain(ordered, starts, (a, b) => a.reservation === b.reservation);
  chain(ordered, starts, any);
  if (starts.length > 0 && !starts.some((start) => start !== undefined)) {
    starts[ordered.findIndex((chunk) => chunk.owned)] = 1;
    chain(ordered, starts, any);
  }

  const result = new Map<number, number>();
  for (const [index, chunk] of ordered.entries()) {
    const start = starts[index];
    if (start !== undefined) {
      result.set(chunk.start, start);
    }
  }
  return result;
}

/**
 * The estimate for one objekt minted after the cutoff: from the nearest known
 * serial in its chunk, else its chunk's first serial plus its position.
 * Outside every known reservation, only a known serial within
 * `LOOSE_ANCHOR_RANGE` ids can place it. Without either, it keeps its stored
 * serial.
 */
function estimate(
  objekt: ObjektSerial,
  reservations: readonly Reservation[],
  chunks: ReadonlyMap<number, Chunk>,
  starts: ReadonlyMap<number, number>,
  anchors: readonly Anchor[],
): number {
  const reservation = findRange(reservations, objekt.tokenId);
  if (reservation === undefined) {
    const anchor = nearest(anchors, objekt.tokenId);
    return anchor &&
      Math.abs(anchor.tokenId - objekt.tokenId) <= LOOSE_ANCHOR_RANGE
      ? anchor.serial + (objekt.tokenId - anchor.tokenId)
      : objekt.serial;
  }

  const start = chunkStart(reservation, objekt.tokenId);
  const anchor = nearest(chunks.get(start)?.anchors ?? [], objekt.tokenId);
  if (anchor !== undefined) {
    return anchor.serial + (objekt.tokenId - anchor.tokenId);
  }
  const first = starts.get(start);
  return first === undefined ? objekt.serial : first + (objekt.tokenId - start);
}

/**
 * Serials for a physical collection or QR coupon set, keyed by token id.
 *
 * COSMO reserves a block of ids when it prints, and serials run through a
 * collection's chunks in reservation order, counting ids nobody has scanned
 * yet. Known serials (real ones from before the cutoff, and confirmations)
 * pin their chunk; the rest is chained through chunk sizes. Known serials are
 * returned as they are.
 */
export function reservedSerials(
  objekts: readonly ObjektSerial[],
  reservations: readonly Reservation[],
  confirmations: ReadonlyMap<number, number>,
  cutoff: number,
): Map<number, number> {
  const sortedReservations = [...reservations].sort((a, b) => a.lo - b.lo);
  const anchors = objekts
    .flatMap((objekt): Anchor[] => {
      const serial =
        confirmations.get(objekt.tokenId) ??
        (objekt.mintedAt <= cutoff && objekt.serial > 0
          ? objekt.serial
          : undefined);
      return serial === undefined ? [] : [{ tokenId: objekt.tokenId, serial }];
    })
    .sort((a, b) => a.tokenId - b.tokenId);
  const chunks = collectChunks(objekts, sortedReservations, anchors);
  const starts = chunkStarts(chunks);

  const serials = new Map<number, number>();
  for (const objekt of objekts) {
    const confirmed = confirmations.get(objekt.tokenId);
    if (confirmed !== undefined) {
      serials.set(objekt.tokenId, confirmed);
    } else if (objekt.mintedAt <= cutoff) {
      serials.set(objekt.tokenId, objekt.serial);
    } else {
      serials.set(
        objekt.tokenId,
        estimate(objekt, sortedReservations, chunks, starts, anchors),
      );
    }
  }
  return serials;
}
