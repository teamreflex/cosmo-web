import { DatabaseWeb } from "@/db";
import { DatabaseIndexer } from "@/db-indexer";
import {
  collections,
  listEventOutbox,
  objekts,
  transfers,
} from "@apollo/database/indexer/schema";
import { listDrainCursor } from "@apollo/database/web/schema";
import { DRAIN_CURSOR_NAME } from "@apollo/trades/timers";
import { addr } from "@apollo/util";
import { BunRuntime } from "@effect/platform-bun";
import { desc, eq, inArray, max, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  pgSchema,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { Data, Effect, Layer } from "effect";
import { randomUUID } from "node:crypto";
import { parseArgs } from "node:util";

/**
 * Local chain simulation for the outbox drain, against the local indexer DB
 * (the processor stays off). Run from apps/schedules:
 *
 *   bun run simulate transfer --token <id> --to <address> [--at <iso>]
 *   bun run simulate transferability --token <id> --transferable <true|false>
 *   bun run simulate init
 *   bun run simulate reset
 *
 * transfer and transferability each change the objekt, the transfer table
 * (transfer only) and the outbox in one transaction, and journal the objekt's
 * previous state in the indexer's `simulate` schema. reset walks the journal
 * backwards, restoring each objekt and deleting each simulated row, then drops
 * the schema, so only simulated rows are ever reverted. The outbox sequence
 * stays advanced, so a later row never reuses an id the drain has passed.
 *
 * init sets the drain cursor to the outbox's max id, so the drain picks up
 * every row simulated after it.
 */

const simulateSchema = pgSchema("simulate");
const journal = simulateSchema.table("journal", {
  id: serial("id").primaryKey(),
  outboxId: bigint("outbox_id", { mode: "bigint" }).notNull(),
  transferId: varchar("transfer_id", { length: 36 }),
  tokenId: text("token_id").notNull(),
  prevOwner: text("prev_owner").notNull(),
  prevReceivedAt: timestamp("prev_received_at", {
    mode: "string",
    withTimezone: true,
  }).notNull(),
  prevTransferable: boolean("prev_transferable").notNull(),
});

type Command =
  | { type: "transfer"; tokenId: string; to: string; at: Date }
  | { type: "transferability"; tokenId: string; transferable: boolean }
  | { type: "init" }
  | { type: "reset" };

class UsageError extends Data.TaggedError("UsageError")<{
  message: string;
}> {}

class TokenNotFoundError extends Data.TaggedError("TokenNotFoundError")<{
  message: string;
}> {}

function usage(message: string) {
  return new UsageError({
    message: `${message}\nusage: simulate transfer --token <id> --to <address> [--at <iso>] | transferability --token <id> --transferable <true|false> | init | reset`,
  });
}

const parseCommand = Effect.gen(function* () {
  const { positionals, values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      token: { type: "string" },
      to: { type: "string" },
      at: { type: "string" },
      transferable: { type: "string" },
    },
  });

  switch (positionals[0]) {
    case "transfer": {
      if (values.token === undefined || values.to === undefined) {
        return yield* usage("transfer needs --token and --to");
      }
      if (!/^0x[0-9a-fA-F]{40}$/.test(values.to)) {
        return yield* usage(`--to is not an address: ${values.to}`);
      }
      const at = values.at === undefined ? new Date() : new Date(values.at);
      if (Number.isNaN(at.getTime())) {
        return yield* usage(`--at is not a date: ${values.at ?? ""}`);
      }
      return {
        type: "transfer",
        tokenId: values.token,
        to: addr(values.to),
        at,
      } satisfies Command;
    }
    case "transferability": {
      if (
        values.token === undefined ||
        (values.transferable !== "true" && values.transferable !== "false")
      ) {
        return yield* usage(
          "transferability needs --token and --transferable true|false",
        );
      }
      return {
        type: "transferability",
        tokenId: values.token,
        transferable: values.transferable === "true",
      } satisfies Command;
    }
    case "init":
      return { type: "init" } satisfies Command;
    case "reset":
      return { type: "reset" } satisfies Command;
    default:
      return yield* usage(`unknown command: ${positionals[0] ?? ""}`);
  }
});

function randomHash() {
  return `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}`;
}

type IndexerTx = Parameters<
  Parameters<typeof DatabaseIndexer.Service.transaction>[0]
>[0];

const createJournal = (tx: IndexerTx) =>
  Effect.gen(function* () {
    yield* tx.execute(sql`create schema if not exists simulate`);
    yield* tx.execute(sql`
      create table if not exists simulate.journal (
        id serial primary key,
        outbox_id bigint not null,
        transfer_id varchar(36),
        token_id text not null,
        prev_owner text not null,
        prev_received_at timestamptz not null,
        prev_transferable boolean not null
      )
    `);
  });

/**
 * Lock the objekt and read what the journal needs to restore it.
 */
const lockObjekt = (tx: IndexerTx, tokenId: string) =>
  Effect.gen(function* () {
    const [objekt] = yield* tx
      .select({
        owner: objekts.owner,
        receivedAt: objekts.receivedAt,
        transferable: objekts.transferable,
        collectionId: objekts.collectionId,
        slug: collections.slug,
      })
      .from(objekts)
      .innerJoin(collections, eq(collections.id, objekts.collectionId))
      .where(eq(objekts.id, tokenId))
      .for("update", { of: objekts });
    if (objekt === undefined) {
      return yield* new TokenNotFoundError({
        message: `objekt ${tokenId} not found in the indexer`,
      });
    }
    return objekt;
  });

const simulateTransfer = (command: Extract<Command, { type: "transfer" }>) =>
  Effect.gen(function* () {
    const indexer = yield* DatabaseIndexer;
    const hash = randomHash();
    const timestamp = command.at.toISOString();

    const result = yield* indexer.transaction((tx) =>
      Effect.gen(function* () {
        yield* createJournal(tx);
        const objekt = yield* lockObjekt(tx, command.tokenId);
        if (!objekt.transferable) {
          yield* Effect.logWarning(
            `objekt ${command.tokenId} is untransferable; moving it anyway`,
          );
        }

        yield* tx
          .update(objekts)
          .set({ owner: command.to, receivedAt: timestamp })
          .where(eq(objekts.id, command.tokenId));

        const transferId = randomUUID();
        yield* tx.insert(transfers).values({
          id: transferId,
          hash,
          from: objekt.owner,
          to: command.to,
          timestamp,
          tokenId: Number(command.tokenId),
          objektId: command.tokenId,
          collectionId: objekt.collectionId,
        });

        const [outbox] = yield* tx
          .insert(listEventOutbox)
          .values({
            type: "transfer",
            transferId,
            fromAddress: objekt.owner,
            toAddress: command.to,
            collectionId: objekt.slug,
            tokenId: command.tokenId,
            timestamp: command.at,
            hash,
          })
          .returning({ id: listEventOutbox.id });
        if (outbox === undefined) return yield* Effect.die("no outbox id");

        yield* tx.insert(journal).values({
          outboxId: outbox.id,
          transferId,
          tokenId: command.tokenId,
          prevOwner: objekt.owner,
          prevReceivedAt: objekt.receivedAt,
          prevTransferable: objekt.transferable,
        });

        return { outboxId: outbox.id, from: objekt.owner };
      }),
    );

    yield* Effect.logInfo(
      `transfer: objekt ${command.tokenId} ${result.from} -> ${command.to} at ${timestamp}, outbox id ${result.outboxId}, hash ${hash}`,
    );
  });

const simulateTransferability = (
  command: Extract<Command, { type: "transferability" }>,
) =>
  Effect.gen(function* () {
    const indexer = yield* DatabaseIndexer;
    const hash = randomHash();
    const at = new Date();

    const outboxId = yield* indexer.transaction((tx) =>
      Effect.gen(function* () {
        yield* createJournal(tx);
        const objekt = yield* lockObjekt(tx, command.tokenId);

        yield* tx
          .update(objekts)
          .set({ transferable: command.transferable })
          .where(eq(objekts.id, command.tokenId));

        const [outbox] = yield* tx
          .insert(listEventOutbox)
          .values({
            type: "transferability",
            transferable: command.transferable,
            collectionId: objekt.slug,
            tokenId: command.tokenId,
            timestamp: at,
            hash,
          })
          .returning({ id: listEventOutbox.id });
        if (outbox === undefined) return yield* Effect.die("no outbox id");

        yield* tx.insert(journal).values({
          outboxId: outbox.id,
          transferId: null,
          tokenId: command.tokenId,
          prevOwner: objekt.owner,
          prevReceivedAt: objekt.receivedAt,
          prevTransferable: objekt.transferable,
        });

        return outbox.id;
      }),
    );

    yield* Effect.logInfo(
      `transferability: objekt ${command.tokenId} transferable=${command.transferable} at ${at.toISOString()}, outbox id ${outboxId}, hash ${hash}`,
    );
  });

const init = Effect.gen(function* () {
  const indexer = yield* DatabaseIndexer;
  const web = yield* DatabaseWeb;

  const [outbox] = yield* indexer
    .select({ maxId: max(listEventOutbox.id) })
    .from(listEventOutbox);
  const seq = outbox?.maxId ?? 0n;

  const previous = yield* web.query.listDrainCursor.findFirst({
    where: { name: DRAIN_CURSOR_NAME },
    columns: { seq: true },
  });

  yield* web
    .insert(listDrainCursor)
    .values({ name: DRAIN_CURSOR_NAME, seq })
    .onConflictDoUpdate({ target: listDrainCursor.name, set: { seq } });

  yield* Effect.logInfo(
    `init: drain cursor ${previous?.seq ?? "(none)"} -> ${seq} (outbox max id)`,
  );
});

const reset = Effect.gen(function* () {
  const indexer = yield* DatabaseIndexer;

  const [exists] = yield* indexer.execute<{ exists: boolean }>(
    sql`select to_regclass('simulate.journal') is not null as exists`,
  );
  if (exists?.exists !== true) {
    yield* Effect.logInfo("reset: nothing simulated");
    return;
  }

  const count = yield* indexer.transaction((tx) =>
    Effect.gen(function* () {
      const entries = yield* tx
        .select()
        .from(journal)
        .orderBy(desc(journal.id));

      // newest first, so each objekt ends at its state before the first simulation
      for (const entry of entries) {
        yield* tx
          .update(objekts)
          .set({
            owner: entry.prevOwner,
            receivedAt: entry.prevReceivedAt,
            transferable: entry.prevTransferable,
          })
          .where(eq(objekts.id, entry.tokenId));
      }

      const transferIds = entries.flatMap((e) =>
        e.transferId === null ? [] : [e.transferId],
      );
      if (transferIds.length > 0) {
        yield* tx.delete(transfers).where(inArray(transfers.id, transferIds));
      }
      if (entries.length > 0) {
        yield* tx.delete(listEventOutbox).where(
          inArray(
            listEventOutbox.id,
            entries.map((e) => e.outboxId),
          ),
        );
      }
      yield* tx.execute(sql`drop schema simulate cascade`);

      return entries.length;
    }),
  );

  yield* Effect.logInfo(
    `reset: reverted ${count} simulated rows and dropped the simulate schema`,
  );
});

const program = Effect.gen(function* () {
  const command = yield* parseCommand;
  switch (command.type) {
    case "transfer":
      return yield* simulateTransfer(command);
    case "transferability":
      return yield* simulateTransferability(command);
    case "init":
      return yield* init;
    case "reset":
      return yield* reset;
  }
});

BunRuntime.runMain(
  program.pipe(
    Effect.provide(Layer.mergeAll(DatabaseWeb.layer, DatabaseIndexer.layer)),
  ),
);
