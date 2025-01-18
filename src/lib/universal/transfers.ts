import { z } from "zod";
import type { Collection, Transfer } from "../server/db/indexer/schema";
import { castToArray } from "./parsers";
import {
  validArtists,
  validClasses,
  validOnlineTypes,
  validSeasons,
} from "./cosmo/common";

export type AggregatedTransfer = {
  transfer: Transfer;
  serial: number | null;
  collection: Collection | null;
  nickname?: string;
};

export type TransferResult = {
  results: AggregatedTransfer[];
  count: number;
  hasNext: boolean;
  nextStartAfter?: number;
};

export const transfersSchema = z.object({
  page: z.coerce.number().default(0),
  type: z.enum(["all", "mint", "received", "sent"]).default("all"),
  member: z.string().optional().nullable(),
  artist: z.enum(validArtists).optional().nullable(),
  season: castToArray(z.enum(validSeasons)),
  class: castToArray(z.enum(validClasses)),
  on_offline: castToArray(z.enum(validOnlineTypes)),
});

export type TransferParams = z.infer<typeof transfersSchema>;
