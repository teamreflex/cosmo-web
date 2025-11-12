This is a [Subsquid SDK](https://docs.sqd.ai/sdk/overview/) application for indexing Modhaus objekts. it processes and saves:

- every objekt type
- every unique objekt
- every ownership change/transfer
- every COMO balance change
- every gravity vote

## Development

The processor uses TypeORM under the hood for database interaction and models are generated based on a GraphQL schema. We do not use the GraphQL server and have cleaned up the codegen'd models. As a result, we edit the model files manually.

Do not run any `sqd`, `subsquid-commands` or `squid-*` commands. These commands are poorly designed and will wipe the migrations directory and generate bad TypeORM models. We must write migrations manually, making sure to follow previous conventions.

When making changes to models/tables, these changes should also be reflected in the Drizzle schemas in `/packages/database/src/indexer/schema.ts`
