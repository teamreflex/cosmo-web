import { Effect } from "effect";
import { classes, members, units } from "./synonyms";
import { Typesense } from "./typesense";

export const COLLECTION_NAME = "collections";
const KEY_DESCRIPTION = "frontend";

/**
 * Creates a new frontend search API key if it doesn't exist
 */
export const setupTypesenseApiKey = Effect.gen(function* () {
  const typesense = yield* Typesense;

  const key = yield* Effect.promise(async () => {
    const { keys } = await typesense.keys().retrieve();
    const frontendKey = keys.find((k) => k.description === KEY_DESCRIPTION);
    return frontendKey;
  });

  if (key) {
    return void 0;
  }

  const newKey = yield* Effect.promise(async () => {
    return await typesense.keys().create({
      description: KEY_DESCRIPTION,
      actions: ["documents:search"],
      collections: [COLLECTION_NAME],
    });
  });

  yield* Effect.logInfo(`Created new frontend search API key: ${newKey.value}`);
});

/**
 * Creates the collection if it doesn't exist
 */
export const setupTypesenseCollection = Effect.gen(function* () {
  const typesense = yield* Typesense;

  const existing = yield* Effect.promise(async () => {
    const list = await typesense.collections().retrieve();
    return list.find((c) => c.name === COLLECTION_NAME);
  });

  if (existing) {
    return void 0;
  }

  yield* Effect.promise(async () => {
    return await typesense.collections().create({
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
    });
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
      yield* Effect.promise(async () => {
        await typesense
          .collections(COLLECTION_NAME)
          .synonyms()
          .upsert(`${key}-${i}`, {
            root: list.units[i],
            synonyms: list.members,
          });
      });
      count++;
    }
  }

  // members
  for (const [root, synonyms] of Object.entries(members)) {
    yield* Effect.promise(async () => {
      await typesense
        .collections(COLLECTION_NAME)
        .synonyms()
        .upsert(`member-${root}`, { root, synonyms });
    });
    count++;
  }

  // classes
  for (const [root, synonyms] of Object.entries(classes)) {
    yield* Effect.promise(async () => {
      await typesense
        .collections(COLLECTION_NAME)
        .synonyms()
        .upsert(`class-${root}`, { root, synonyms });
    });
    count++;
  }

  yield* Effect.logInfo(`Upserted ${count} synonyms`);
});
