-- Rename sequence to match new table name
ALTER SEQUENCE "objekt_metadata_id_seq" RENAME TO "collection_data_id_seq";--> statement-breakpoint
-- Rename primary key constraint to match new table name
ALTER INDEX "objekt_metadata_pkey" RENAME TO "collection_data_pkey";--> statement-breakpoint
-- Rename unique constraint to match new table name
ALTER INDEX "objekt_metadata_collection_id_unique" RENAME TO "collection_data_collection_id_unique";
