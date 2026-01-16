# typesense-import

Continuously syncs objekt collection data from the indexer database to Typesense search engine.

- Polls the indexer database for new objekt collections
- Enriches collection data with metadata from the web database
- Upserts collections to Typesense in bulk
- Automatically sets up Typesense collections, API keys, and synonyms on first run
- Runs on a configurable loop interval (default: 10 minutes)
