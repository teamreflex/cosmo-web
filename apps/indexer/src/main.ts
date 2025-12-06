import { processor, type ProcessorContext } from "./processor";
import {
  type ComoBalanceEvent,
  type TransferabilityUpdate,
  type VoteEvent,
  parseBlocks,
} from "./parser";
import { Collection, ComoBalance, Objekt, type Transfer, Vote } from "./model";
import { addr, chunk } from "@apollo/util";
import { TypeormDatabase, type Store } from "@subsquid/typeorm-store";
import { randomUUID } from "crypto";
import { env } from "./env";
import { Addresses } from "@apollo/util";
import { fetchMetadataV1 } from "@apollo/cosmo/server/metadata";
import type { CosmoObjektMetadataV1 } from "@apollo/cosmo/types/metadata";

const db = new TypeormDatabase({ supportHotBlocks: true });

processor.run(db, async (ctx) => {
  const { transfers, transferability, comoBalanceUpdates, votes } = parseBlocks(
    ctx.blocks,
  );

  if (env.ENABLE_OBJEKTS) {
    if (transfers.length > 0) {
      ctx.log.info(`Processing ${transfers.length} objekt transfers`);
    }

    // chunk everything into batches
    await chunk(transfers, env.COSMO_PARALLEL_COUNT, async (chunk) => {
      const transferBatch: Transfer[] = [];
      const collectionBatch = new Map<string, Collection>();
      const objektBatch = new Map<string, Objekt>();

      const metadataBatch = await Promise.allSettled(
        chunk.map((e) => fetchMetadataV1(e.tokenId)),
      );

      // iterate over each objekt metadata request
      for (let j = 0; j < metadataBatch.length; j++) {
        const request = metadataBatch[j];
        const transfer = chunk[j];
        if (!transfer || !request || request.status === "rejected") {
          ctx.log.error(
            `Unable to fetch metadata for token ${transfer?.tokenId ?? "unknown"}`,
          );
          continue;
        }

        // handle collection
        const collection = await handleCollection(
          ctx,
          request.value,
          collectionBatch,
          transfer,
        );
        collectionBatch.set(collection.slug, collection);

        // handle objekt
        const objekt = await handleObjekt(
          ctx,
          request.value,
          objektBatch,
          transfer,
        );
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
      const vote = await handleVoteCreation(event);
      voteBatch.push(vote);
    }

    if (voteBatch.length > 0) {
      await ctx.store.upsert(voteBatch);
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
  const slug = metadata.objekt.collectionId
    .toLowerCase()
    // replace diacritics
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // remove non-alphanumeric characters
    .replace(/[^\w\s-]/g, "")
    // replace spaces with hyphens
    .replace(/\s+/g, "-");

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
  collection.backImage = metadata.objekt.backImage;
  collection.backgroundColor = metadata.objekt.backgroundColor;
  collection.textColor = metadata.objekt.textColor;
  collection.accentColor = metadata.objekt.accentColor;

  return collection;
}

/**
 * Create or update the objekt row.
 */
async function handleObjekt(
  ctx: ProcessorContext<Store>,
  metadata: CosmoObjektMetadataV1,
  buffer: Map<string, Objekt>,
  transfer: Transfer,
) {
  // fetch out of buffer
  let objekt = buffer.get(transfer.tokenId);

  // fetch from db
  if (!objekt) {
    objekt = await ctx.store.get(Objekt, transfer.tokenId);
  }

  // if not new, update fields. skip transferable
  if (objekt) {
    objekt.receivedAt = new Date(transfer.timestamp);
    objekt.owner = addr(transfer.to);
    return objekt;
  }

  // otherwise create it
  if (!objekt) {
    objekt = new Objekt({
      id: transfer.tokenId,
      mintedAt: new Date(transfer.timestamp),
      receivedAt: new Date(transfer.timestamp),
      owner: addr(transfer.to),
      serial: metadata.objekt.objektNo,
      transferable: metadata.objekt.transferable,
    });
  }

  return objekt;
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
async function handleVoteCreation(event: VoteEvent) {
  return new Vote({
    id: randomUUID(),
    from: event.from,
    createdAt: new Date(event.timestamp),
    contract: event.contract,
    pollId: event.pollId,
    amount: event.tokenAmount,
    blockNumber: event.blockNumber,
    hash: event.hash,
  });
}
