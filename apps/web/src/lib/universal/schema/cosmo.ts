import { validArtists } from "@apollo/cosmo/types/common";
import { isAddress } from "@apollo/util";
import * as z from "zod";

export const verifyCosmoSchema = z.object({
  otp: z.number(),
  ticket: z.string(),
});

export const queryTicketSchema = z.object({
  ticket: z.string(),
});

export const userSearchSchema = z.object({
  query: z.string(),
});

export const generateVerificationCodeSchema = z.object({
  userId: z.number(),
  artistId: z.enum(validArtists),
  address: z.string().refine(isAddress),
});

export const verifyCosmoBioSchema = z.object({
  code: z.string().length(6),
});

/**
 * The artists a visitor selected in the navbar, as their cookie stores them.
 * An id the app doesn't know is dropped on its own, keeping the rest.
 */
export const selectedArtistsSchema = z
  .array(z.string())
  .transform((ids) => validArtists.filter((artist) => ids.includes(artist)));
