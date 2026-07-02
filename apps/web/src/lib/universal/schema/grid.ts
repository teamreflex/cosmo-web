import { validArtists } from "@apollo/cosmo/types/common";
import * as z from "zod";

export const gridLedgerSchema = z.object({
  address: z.string(),
  artist: z.enum(validArtists),
});

export type GridLedgerParams = z.infer<typeof gridLedgerSchema>;
