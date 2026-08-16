import { Data, Effect } from "effect";
import { classes, members, units } from "./synonyms";
import { Typesense } from "./typesense";

export const COLLECTION_NAME = "collections";
const KEY_DESCRIPTION = "frontend";

/**
 * Creates a new frontend search API key if it doesn't exist
 */
export const setupTypesenseApiKey = Effect.gen(function* () {
  const typesense = yield* Typesense;

  const key = yield* Effect.tryPromise({
    try: async () => {
      const { keys } = await typesense.keys().retrieve();
      return keys.find((k) => k.description === KEY_DESCRIPTION);
    },
    catch: (cause) => new RetrieveKeysError({ cause }),
  });

  if (key) {
    return void 0;
  }

  const newKey = yield* Effect.tryPromise({
    try: () =>
      typesense.keys().create({
        description: KEY_DESCRIPTION,
        actions: ["documents:search"],
        collections: [COLLECTION_NAME],
      }),
    catch: (cause) => new CreateKeyError({ cause }),
  });

  yield* Effect.logInfo(`Created new frontend search API key: ${newKey.value}`);
});

/**
 * Creates the collection if it doesn't exist
 */
export const setupTypesenseCollection = Effect.gen(function* () {
  const typesense = yield* Typesense;

  const existing = yield* Effect.tryPromise({
    try: async () => {
      const list = await typesense.collections().retrieve();
      return list.find((c) => c.name === COLLECTION_NAME);
    },
    catch: (cause) => new RetrieveCollectionsError({ cause }),
  });

  if (existing) {
    // 260628 - need to recreate the schema if new fields don't exist
    const upToDate =
      existing.fields?.some((f) => f.name === "memberSortOrder") &&
      existing.fields?.some((f) => f.name === "collectionNo" && f.sort);

    if (upToDate) {
      return void 0;
    }

    yield* Effect.logInfo(`Schema outdated, recreating: ${COLLECTION_NAME}`);
    yield* Effect.tryPromise({
      try: () => typesense.collections(COLLECTION_NAME).delete(),
      catch: (cause) => new DeleteCollectionError({ cause }),
    });
  }

  yield* Effect.tryPromise({
    try: () =>
      typesense.collections().create({
        name: COLLECTION_NAME,
        fields: [
          // #region metadata fields
          {
            name: "createdAt",
            type: "int64",
            default_sorting_field: true,
          },
          // #endregion

          // #region indexed fields
          {
            name: "artist",
            type: "string",
            index: true,
            facet: true,
          },
          {
            name: "member",
            type: "string",
            index: true,
            facet: true,
          },
          {
            // numeric COSMO member order, sorted on by the memberAsc/memberDesc
            // sorts. optional because unsynced members have no order yet.
            name: "memberSortOrder",
            type: "int32",
            optional: true,
          },
          {
            name: "season",
            type: "string",
            index: true,
            facet: true,
          },
          {
            name: "class",
            type: "string",
            index: true,
            facet: true,
          },
          {
            name: "collectionNo",
            type: "string",
            index: true,
            sort: true,
          },
          {
            name: "description",
            type: "string",
            optional: true,
            index: true,
          },
          {
            name: "collectionId",
            type: "string",
            index: true,
            token_separators: [" "],
          },
          {
            name: "shortCode",
            type: "string",
            index: true,
          },
          {
            name: "edition",
            type: "string",
            index: true,
            optional: true,
          },
          // #endregion

          // #region display field
          { name: "thumbnailImage", type: "string", index: false },
          { name: "frontImage", type: "string", index: false },
          { name: "backImage", type: "string", index: false },
          { name: "backgroundColor", type: "string", index: false },
          { name: "textColor", type: "string", index: false },
          { name: "accentColor", type: "string", index: false },
          { name: "comoAmount", type: "int32", index: false },
          { name: "onOffline", type: "string", index: false },
          // #endregion
        ],
      }),
    catch: (cause) => new CreateCollectionError({ cause }),
  });

  yield* Effect.logInfo(`Created collection: ${COLLECTION_NAME}`);
});

/**
 * Upserts the synonyms for the collections.
 *
 * Example: "odd eye circle", "oec" all match to "KimLip", "JinSoul", "Choerry"
 */
export const setupTypesenseSynonyms = Effect.gen(function* () {
  const typesense = yield* Typesense;

  let count = 0;

  // units
  for (const [key, list] of Object.entries(units)) {
    for (let i = 0; i < list.units.length; i++) {
      yield* Effect.tryPromise({
        try: () =>
          typesense
            .collections(COLLECTION_NAME)
            .synonyms()
            .upsert(`${key}-${i}`, {
              root: list.units[i],
              synonyms: list.members,
            }),
        catch: (cause) => new UpsertSynonymError({ id: `${key}-${i}`, cause }),
      });
      count++;
    }
  }

  // members
  for (const [root, synonyms] of Object.entries(members)) {
    yield* Effect.tryPromise({
      try: () =>
        typesense
          .collections(COLLECTION_NAME)
          .synonyms()
          .upsert(`member-${root}`, { root, synonyms }),
      catch: (cause) => new UpsertSynonymError({ id: `member-${root}`, cause }),
    });
    count++;
  }

  // classes
  for (const [root, synonyms] of Object.entries(classes)) {
    yield* Effect.tryPromise({
      try: () =>
        typesense
          .collections(COLLECTION_NAME)
          .synonyms()
          .upsert(`class-${root}`, { root, synonyms }),
      catch: (cause) => new UpsertSynonymError({ id: `class-${root}`, cause }),
    });
    count++;
  }

  yield* Effect.logInfo(`Upserted ${count} synonyms`);
});

/**
 * Failed to list existing Typesense API keys.
 */
export class RetrieveKeysError extends Data.TaggedError("RetrieveKeysError")<{
  readonly cause: unknown;
}> {}

/**
 * Failed to create the frontend search API key.
 */
export class CreateKeyError extends Data.TaggedError("CreateKeyError")<{
  readonly cause: unknown;
}> {}

/**
 * Failed to list existing Typesense collections.
 */
export class RetrieveCollectionsError extends Data.TaggedError(
  "RetrieveCollectionsError",
)<{
  readonly cause: unknown;
}> {}

/**
 * Failed to create the Typesense collection schema.
 */
export class CreateCollectionError extends Data.TaggedError(
  "CreateCollectionError",
)<{
  readonly cause: unknown;
}> {}

/**
 * Failed to delete the outdated Typesense collection before recreating it.
 */
export class DeleteCollectionError extends Data.TaggedError(
  "DeleteCollectionError",
)<{
  readonly cause: unknown;
}> {}

/**
 * Failed to upsert a synonym set into the collection.
 */
export class UpsertSynonymError extends Data.TaggedError("UpsertSynonymError")<{
  readonly id: string;
  readonly cause: unknown;
}> {}
