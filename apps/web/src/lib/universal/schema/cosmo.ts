import { validArtists } from "@apollo/cosmo/types/common";
import * as z from "zod";

export const verifyCosmoSchema = z.object({
  otp: z.number(),
  ticket: z.string(),
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
