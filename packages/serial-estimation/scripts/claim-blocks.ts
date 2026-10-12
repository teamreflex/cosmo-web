// oxlint-disable no-console -- CLI script reporting results on stdout
import { collections } from "@apollo/database/indexer/schema";
import { claimBlocks, collectionKind, SERIAL_CUTOFF } from "../src";
import { client, db, INDEXER_DATABASE_URL } from "./database";

/**
 * Find claim blocks in the indexer database at INDEXER_DATABASE_URL: ranges
 * of a digital collection's token ids that COSMO allocated together and
 * minted as claims long afterwards, with many ids still unminted. Their
 * serials count in full, so each one belongs in `CLAIM_BLOCKS`.
 *
 *   bun scripts/claim-blocks.ts
 *
 * A digital mint is a claim when its token id was already below the highest
 * digital id minted so far. Runs of one collection's claims with no other
 * digital mint between them are candidate blocks; a run spanning at least
 * twice as many ids as it has claims is reported. Dense runs are delayed
 * batches, which token-id order already numbers correctly. Streams objekts
 * through `psql`, so nothing is written to disk.
 */

const MIN_CLAIMS = 10;

const rows = await db
  .select({
    id: collections.id,
    slug: collections.slug,
    onOffline: collections.onOffline,
  })
  .from(collections);
const index = new Map(rows.map((row, position) => [row.id, position]));
const sequential = rows.map(
  (row) => collectionKind(row.slug, row.onOffline) === "sequential",
);

/**
 * Every digital objekt as parallel typed arrays.
 */
let capacity = 1 << 25;
let size = 0;
let tokenIds = new Float64Array(capacity);
let mintedAts = new Float64Array(capacity);
let owners = new Int32Array(capacity);

const psql = Bun.spawn(
  [
    "psql",
    INDEXER_DATABASE_URL,
    "-c",
    String.raw`\copy (select id, collection_id, (extract(epoch from minted_at) * 1000)::bigint from objekt) to stdout`,
  ],
  { stdout: "pipe", stderr: "inherit" },
);
let pending = "";
const decoder = new TextDecoder();
for await (const bytes of psql.stdout) {
  const lines = (pending + decoder.decode(bytes, { stream: true })).split("\n");
  pending = lines.pop() ?? "";
  for (const line of lines) {
    const [id, collectionId, mintedAt] = line.split("\t");
    const owner =
      collectionId === undefined ? undefined : index.get(collectionId);
    if (owner === undefined || !sequential[owner]) {
      continue;
    }
    if (size === capacity) {
      capacity *= 2;
      const grow = <T extends Float64Array | Int32Array>(from: T, to: T) => {
        to.set(from);
        return to;
      };
      tokenIds = grow(tokenIds, new Float64Array(capacity));
      mintedAts = grow(mintedAts, new Float64Array(capacity));
      owners = grow(owners, new Int32Array(capacity));
    }
    tokenIds[size] = Number(id);
    mintedAts[size] = Number(mintedAt);
    owners[size] = owner;
    size++;
  }
}
await psql.exited;

// mark claims: minted when the frontier had already passed their id
const late = new Uint8Array(size);
const byMintTime = Uint32Array.from({ length: size }, (_, row) => row).sort(
  (a, b) =>
    (mintedAts[a] ?? 0) - (mintedAts[b] ?? 0) ||
    (tokenIds[a] ?? 0) - (tokenIds[b] ?? 0),
);
let frontier = 0;
for (const row of byMintTime) {
  const tokenId = tokenIds[row] ?? 0;
  if (tokenId < frontier) {
    late[row] = 1;
  }
  frontier = Math.max(frontier, tokenId);
}

// group claims into runs of one collection with no other digital mint between
type Run = {
  owner: number;
  claims: number;
  from: number;
  to: number;
  first: number;
  last: number;
};
const runs: Run[] = [];
let run: Run | undefined;
for (const row of Uint32Array.from({ length: size }, (_, row) => row).sort(
  (a, b) => (tokenIds[a] ?? 0) - (tokenIds[b] ?? 0),
)) {
  const owner = owners[row] ?? -1;
  const tokenId = tokenIds[row] ?? 0;
  const mintedAt = mintedAts[row] ?? 0;
  if (!late[row]) {
    run = undefined;
  } else if (run?.owner === owner) {
    run.claims++;
    run.to = tokenId;
    run.first = Math.min(run.first, mintedAt);
    run.last = Math.max(run.last, mintedAt);
  } else {
    run = {
      owner,
      claims: 1,
      from: tokenId,
      to: tokenId,
      first: mintedAt,
      last: mintedAt,
    };
    runs.push(run);
  }
}

/**
 * Report sparse runs. Ones claimed entirely before the cutoff have real
 * serials, which estimates after them anchor on, so only NEW runs need
 * adding to CLAIM_BLOCKS.
 */
const day = (time: number) => new Date(time).toISOString().slice(0, 10);
const sparse = runs.filter(
  (candidate) =>
    candidate.claims >= MIN_CLAIMS &&
    candidate.to - candidate.from + 1 >= 2 * candidate.claims,
);
console.log(
  `${size} digital objekts, ${runs.length} runs of claims, ${sparse.length} sparse`,
);
for (const candidate of sparse) {
  const slug = rows[candidate.owner]?.slug ?? "";
  const known = claimBlocks(slug).some(
    (block) => block.from <= candidate.from && candidate.to <= block.to,
  );
  console.log(
    [
      slug,
      `${candidate.claims} claims`,
      `${candidate.from}-${candidate.to}`,
      `${day(candidate.first)} to ${day(candidate.last)}`,
      known
        ? "known"
        : candidate.last <= SERIAL_CUTOFF
          ? "before cutoff"
          : "NEW",
    ].join("\t"),
  );
}
await client.close();
