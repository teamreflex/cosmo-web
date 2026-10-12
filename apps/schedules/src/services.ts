import { BunServices } from "@effect/platform-bun";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { CosmoKey } from "./cosmo-key";
import { DatabaseWeb } from "./db";
import { DatabaseIndexer } from "./db-indexer";
import { Exchangerate } from "./exchangerate";
import { ProxiedToken } from "./proxied-token";
import { redisLayer } from "./redis";

/**
 * Every service a scheduled task can use, shared by `main.ts` and the
 * one-shot `run-task.ts` runner.
 */
export const servicesLayer = Layer.mergeAll(
  BunServices.layer,
  FetchHttpClient.layer,
  DatabaseWeb.layer,
  DatabaseIndexer.layer,
  ProxiedToken.layer,
  CosmoKey.layer,
  Exchangerate.layer,
  redisLayer,
);
