-- fix drizzle + bun:sql bug with double string encoding json columns
UPDATE "events" SET "seasons" = ("seasons" #>> '{}')::jsonb WHERE jsonb_typeof("seasons") = 'string';