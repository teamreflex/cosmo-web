import { validArtists } from "@apollo/cosmo/types/common";
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
  address: z.string(),
  nickname: z.string(),
  artistId: z.enum(validArtists),
});

export const verifyCosmoBioSchema = generateVerificationCodeSchema.extend({
  code: z.string().length(6),
});
