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
