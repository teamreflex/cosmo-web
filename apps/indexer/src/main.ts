import type { CosmoObjektMetadataV1 } from "@apollo/cosmo/types/metadata";
import { addr, chunk, slugifyObjekt } from "@apollo/util";
import { Addresses } from "@apollo/util";
import { TypeormDatabase, type Store } from "@subsquid/typeorm-store";
import { randomUUID } from "crypto";
import { In } from "typeorm";
import { env } from "./env";
import { fetchMetadata, type MetadataResult } from "./metadata";
import { Collection, ComoBalance, Objekt, type Transfer, Vote } from "./model";
import { ListEventOutbox } from "./model";
import {
  type ComoBalanceEvent,
  type RevealFunction,
  type TransferabilityUpdate,
  type VoteEvent,
  parseBlocks,
} from "./parser";
import { processor, type ProcessorContext } from "./processor";

const db = new TypeormDatabase({ supportHotBlocks: true });

processor.run(db, async (ctx) => {
  const { transfers, transferability, comoBalanceUpdates, votes, reveals } =
    parseBlocks(ctx.blocks);

  if (env.ENABLE_OBJEKTS) {
    if (transfers.length > 0) {
      ctx.log.info(`Processing ${transfers.length} objekt transfers`);
    }

    // chunk everything into batches
    await chunk(transfers, env.COSMO_PARALLEL_COUNT, async (chunk) => {
      const transferBatch: Transfer[] = [];
      const collectionBatch = new Map<string, Collection>();
      const objektBatch = new Map<string, Objekt>();

      // batch-load existing objekts (the bulk of trades) with their collection,
      // so only mints/unknown tokens incur a metadata fetch + collection lookup.
      const tokenIds = [...new Set(chunk.map((t) => t.tokenId))];
      const existing = await ctx.store.find(Objekt, {
        where: { id: In(tokenIds) },
        relations: { collection: true },
      });
      const existingById = new Map(existing.map((o) => [o.id, o]));

      // fetch metadata only for tokens we've never seen before
      const unknownTokenIds = tokenIds.filter((id) => !existingById.has(id));
      const metadataResults = await Promise.allSettled(
        unknownTokenIds.map((id) => fetchMetadata(id)),
      );
      const metadataByToken = new Map<
        string,
        PromiseSettledResult<MetadataResult>
      >();
      unknownTokenIds.forEach((id, i) => {
        const result = metadataResults[i];
        if (result) metadataByToken.set(id, result);
      });

      // iterate over each transfer in chronological order
      for (const transfer of chunk) {
        // in-chunk buffer first (handles mint→trade within one chunk), then db
        const existingObjekt =
          objektBatch.get(transfer.tokenId) ??
          existingById.get(transfer.tokenId);

        // known objekt: reuse its collection, just update ownership. no fetch.
        if (existingObjekt) {
          updateExistingObjekt(existingObjekt, transfer);
          objektBatch.set(existingObjekt.id, existingObjekt);

          transfer.objekt = existingObjekt;
          transfer.collection = existingObjekt.collection;
          transferBatch.push(transfer);
          continue;
        }

        // unknown objekt: needs metadata to create it (mint, or lazy-create)
        const request = metadataByToken.get(transfer.tokenId);
        if (!request || request.status === "rejected") {
          ctx.log.error(
            `Unable to fetch metadata for token ${transfer.tokenId}`,
          );
          continue;
        }

        const { source, data } = request.value;

        // handle collection
        const collection = await handleCollection(
          ctx,
          data,
          collectionBatch,
          transfer,
        );
        collectionBatch.set(collection.slug, collection);

        // handle objekt
        const objekt = createObjekt(data, source, transfer);
        objekt.collection = collection;
        objektBatch.set(objekt.id, objekt);

        // handle transfer
        transfer.objekt = objekt;
        transfer.collection = collection;
        transferBatch.push(transfer);
      }

      // upsert collections
      if (collectionBatch.size > 0) {
        await ctx.store.upsert(Array.from(collectionBatch.values()));
      }

      // upsert objekts
      if (objektBatch.size > 0) {
        await ctx.store.upsert(Array.from(objektBatch.values()));
      }

      // upsert transfers
      if (transferBatch.length > 0) {
        await ctx.store.upsert(transferBatch);
      }

      // mints should not be inserted into the outbox
      const userTransfers = transferBatch.filter(
        (t) => t.from !== Addresses.NULL,
      );

      // insert outbox rows
      if (userTransfers.length > 0) {
        const outboxRows = userTransfers.map(
          (t) =>
            new ListEventOutbox({
              transferId: t.id,
              fromAddress: t.from,
              toAddress: t.to,
              // store the slug (not the UUID) so the web-side drain can match
              // it directly against objekt_list_entries.collection_id, which is also a slug.
              collectionId: t.collection.slug,
              tokenId: t.tokenId,
              timestamp: new Date(t.timestamp),
            }),
        );
        await ctx.store.insert(outboxRows);
      }
    });

    // process transferability updates separately from transfers
    if (transferability.length > 0) {
      ctx.log.info(
        `Handling ${transferability.length} transferability updates`,
      );
      await handleTransferabilityUpdates(ctx, transferability);
    }

    // #region como balance updates
    if (comoBalanceUpdates.length > 0) {
      ctx.log.info(
        `Processing ${comoBalanceUpdates.length} COMO balance updates`,
      );
    }

    await chunk(comoBalanceUpdates, 2000, async (chunk) => {
      const comoBalanceBatch = new Map<string, ComoBalance>();
      for (const event of chunk) {
        const balances = await handleComoBalanceUpdate(
          ctx,
          comoBalanceBatch,
          event,
        );

        for (const balance of balances) {
          comoBalanceBatch.set(
            balanceKey({ owner: balance.owner, tokenId: balance.tokenId }),
            balance,
          );
        }
      }

      if (comoBalanceBatch.size > 0) {
        await ctx.store.upsert(Array.from(comoBalanceBatch.values()));
      }
    });
    // #endregion
  }

  if (env.ENABLE_GRAVITY) {
    // #region votes
    const voteBatch: Vote[] = [];

    if (votes.length > 0) {
      ctx.log.info(`Processing ${votes.length} gravity votes`);
    }

    for (const event of votes) {
      const vote = handleVoteCreation(event);
      voteBatch.push(vote);
    }

    if (voteBatch.length > 0) {
      await ctx.store.upsert(voteBatch);
    }
    // #endregion

    // #region reveals
    if (reveals.length > 0) {
      ctx.log.info(`Processing ${reveals.length} gravity reveals`);
      await handleReveals(ctx, reveals);
    }
    // #endregion
  }
});

/**
 * Create or update the collection row.
 */
async function handleCollection(
  ctx: ProcessorContext<Store>,
  metadata: CosmoObjektMetadataV1,
  buffer: Map<string, Collection>,
  transfer: Transfer,
) {
  const slug = slugifyObjekt(metadata.objekt.collectionId);

  // fetch from db
  let collection = await ctx.store.get(Collection, {
    where: {
      slug: slug,
    },
  });

  // fetch out of buffer
  if (!collection) {
    collection = buffer.get(slug);
  }

  // create
  if (!collection) {
    collection = new Collection({
      id: randomUUID(),
      contract: addr(metadata.objekt.tokenAddress),
      createdAt: new Date(transfer.timestamp),
      collectionId: metadata.objekt.collectionId,
      slug: slug,
      textColor: metadata.objekt.textColor,
      backImage: metadata.objekt.backImage,
      accentColor: metadata.objekt.accentColor,
    });
  }

  // set and/or update metadata
  collection.season = metadata.objekt.season;
  collection.member = metadata.objekt.member;
  collection.artist = metadata.objekt.artists[0]!.toLowerCase();
  collection.collectionNo = metadata.objekt.collectionNo;
  collection.class = metadata.objekt.class;
  collection.comoAmount = metadata.objekt.comoAmount;
  collection.onOffline = metadata.objekt.collectionNo.includes("Z")
    ? "online"
    : "offline";
  collection.thumbnailImage = metadata.objekt.thumbnailImage;
  collection.frontImage = metadata.objekt.frontImage;
  collection.backgroundColor = metadata.objekt.backgroundColor;

  return collection;
}

/**
 * Update an existing objekt's ownership for a transfer. Mutates in place and
 * leaves transferable untouched; the caller buffers it for upsert.
 */
function updateExistingObjekt(objekt: Objekt, transfer: Transfer) {
  objekt.receivedAt = new Date(transfer.timestamp);
  objekt.owner = addr(transfer.to);
}

/**
 * Create a new objekt row from freshly fetched metadata. A non-mint transfer can
 * reach here when its objekt is missing (reorg/restart/previously-dropped mint);
 * in that case mintedAt is this transfer's timestamp rather than the true mint
 * time, an accepted inaccuracy.
 */
function createObjekt(
  metadata: CosmoObjektMetadataV1,
  source: MetadataResult["source"],
  transfer: Transfer,
) {
  return new Objekt({
    id: transfer.tokenId,
    mintedAt: new Date(transfer.timestamp),
    receivedAt: new Date(transfer.timestamp),
    owner: addr(transfer.to),
    // v3 fallback can't supply a real serial; 0 is the placeholder the serial-0
    // backfill repairs once v1 recovers.
    serial: source === "v3" ? 0 : metadata.objekt.objektNo,
    transferable: metadata.objekt.transferable,
  });
}

/**
 * Update a batch of transferability updates.
 */
async function handleTransferabilityUpdates(
  ctx: ProcessorContext<Store>,
  updates: TransferabilityUpdate[],
) {
  const batch = new Map<string, Objekt>();
  for (const update of updates) {
    const objekt = await ctx.store.get(Objekt, update.tokenId);
    if (objekt) {
      objekt.transferable = update.transferable;
      batch.set(objekt.id, objekt);
    } else {
      ctx.log.error(
        `Unable to find objekt ${update.tokenId} for transferability update`,
      );
    }
  }
  if (batch.size > 0) {
    await ctx.store.upsert(Array.from(batch.values()));
  }
}

const EXCLUDE = Object.values(Addresses);

/**
 * Update como balance.
 */
async function handleComoBalanceUpdate(
  ctx: ProcessorContext<Store>,
  buffer: Map<string, ComoBalance>,
  event: ComoBalanceEvent,
) {
  const toUpdate: ComoBalance[] = [];

  if (EXCLUDE.includes(event.from) === false) {
    const from = await getBalance(ctx, buffer, event.from, event.tokenId);

    from.amount -= event.value;
    toUpdate.push(from);
  }

  if (EXCLUDE.includes(event.to) === false) {
    const to = await getBalance(ctx, buffer, event.to, event.tokenId);

    to.amount += event.value;
    toUpdate.push(to);
  }

  return toUpdate;
}

/**
 * For the sake of not being able to mess this up.
 */
function balanceKey({ owner, tokenId }: { owner: string; tokenId: number }) {
  return `${owner}-${tokenId}`;
}

/**
 * Fetch a como balance from the buffer, db or create a new one.
 */
async function getBalance(
  ctx: ProcessorContext<Store>,
  buffer: Map<string, ComoBalance>,
  owner: string,
  tokenId: number,
) {
  let balance = buffer.get(balanceKey({ owner, tokenId }));

  // fetch from db
  if (!balance) {
    balance = await ctx.store.get(ComoBalance, {
      where: { owner, tokenId },
    });
  }

  // create
  if (!balance) {
    balance = new ComoBalance({
      id: randomUUID(),
      tokenId: tokenId,
      owner: owner,
      amount: BigInt(0),
    });
  }

  return balance;
}

/**
 * Create a new vote row.
 */
function handleVoteCreation(event: VoteEvent) {
  return new Vote({
    id: randomUUID(),
    from: event.from,
    createdAt: new Date(event.timestamp),
    tokenId: event.tokenId,
    pollId: event.pollId,
    amount: event.tokenAmount,
    blockNumber: event.blockNumber,
    logIndex: event.logIndex,
    hash: event.hash,
    candidateId: null,
  });
}

/**
 * Match reveals to votes and update candidateId.
 */
async function handleReveals(
  ctx: ProcessorContext<Store>,
  reveals: RevealFunction[],
) {
  // Group reveals by (tokenId, pollId)
  const grouped = new Map<string, RevealFunction[]>();
  for (const reveal of reveals) {
    const key = `${reveal.tokenId}-${reveal.pollId}`;
    const existing = grouped.get(key) ?? [];
    existing.push(reveal);
    grouped.set(key, existing);
  }

  for (const [key, pollReveals] of grouped) {
    const [tokenId, pollId] = key.split("-").map(Number);

    // Get all votes for this poll, ordered by position (blockNumber, logIndex)
    const votes = await ctx.store.find(Vote, {
      where: { tokenId, pollId },
      order: { blockNumber: "ASC", logIndex: "ASC" },
    });

    // Match each reveal to its vote by position
    const toUpdate: Vote[] = [];
    for (const reveal of pollReveals) {
      const vote = votes[reveal.position];
      if (vote && vote.candidateId === null) {
        vote.candidateId = reveal.candidateId;
        toUpdate.push(vote);
      }
    }

    if (toUpdate.length > 0) {
      await ctx.store.upsert(toUpdate);
    }
  }
}
