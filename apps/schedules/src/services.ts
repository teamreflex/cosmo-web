import { DatabaseWeb } from "@apollo/services/database-web";
import { redisLayer } from "@apollo/services/redis";
import { BunServices } from "@effect/platform-bun";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { CosmoKey } from "./cosmo-key";
import { DatabaseIndexer } from "./db-indexer";
import { Exchangerate } from "./exchangerate";
import { ProxiedToken } from "./proxied-token";

/**
 * The app's only web DB layer. Layers memoize by reference, so every use
 * shares this one single-connection client.
 */
export const webDatabaseLayer = DatabaseWeb.layer({
  applicationName: "Schedules",
  max: 1,
});

/**
 * Every service a scheduled task can use, shared by `main.ts` and the
 * one-shot `run-task.ts` runner.
 */
export const servicesLayer = Layer.mergeAll(
  BunServices.layer,
  FetchHttpClient.layer,
  DatabaseIndexer.layer,
  ProxiedToken.layer,
  CosmoKey.layer,
  Exchangerate.layer,
  redisLayer,
).pipe(Layer.provideMerge(webDatabaseLayer));
