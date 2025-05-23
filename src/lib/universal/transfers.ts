import { z } from "zod";
import type { Collection, Transfer } from "../server/db/indexer/schema";
import { castToArray } from "./parsers";
import { validArtists, validOnlineTypes } from "./cosmo/common";

export type AggregatedTransfer = {
  transfer: Transfer;
  serial: number | null;
  collection: Collection | null;
  username?: string;
  isSpin: boolean;
};

export type TransferResult = {
  results: AggregatedTransfer[];
  nextStartAfter?: number;
};

export const transfersSchema = z.object({
  page: z.coerce.number().default(0),
  type: z.enum(["all", "mint", "received", "sent", "spin"]).default("all"),
  member: z.string().optional().nullable(),
  artist: z.enum(validArtists).optional().nullable(),
  season: z.string().array(),
  class: z.string().array(),
  on_offline: castToArray(z.enum(validOnlineTypes)),
});

export type TransferParams = z.infer<typeof transfersSchema>;
