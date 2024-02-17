"use server";

import "server-only";
import { z } from "zod";
import { authenticatedAction } from "@/lib/server/typed-action";
import { claimGridReward, completeGrid } from "@/lib/server/cosmo/grid";
import { env } from "@/env.mjs";
import {
  CosmoGridRewardClaimResult,
  CosmoGridSlotCompletion,
} from "@/lib/universal/cosmo/grid";

type SubmitGridProps = {
  slug: string;
  slots: CosmoGridSlotCompletion[];
};

/**
 * Submit a grid and claim its reward.
 */
export const submitGrid = async (form: SubmitGridProps) =>
  authenticatedAction({
    form,

    schema: z.object({
      slug: z.string(),
      slots: z
        .object({
          no: z.number(),
          tokenIdToUse: z.string(),
        })
        .array(),
    }),
    onValidate: async ({ data: { slug, slots }, user }) => {
      // dev: simulate grid completion
      if (env.NEXT_PUBLIC_SIMULATE_GRID) {
        console.log(`[apollo-dev] Simulating grid completion`);
        return simulated;
      }

      await completeGrid(user.accessToken, slug, slots);
      return await claimGridReward(user.accessToken, slug);
    },
  });

const simulated: CosmoGridRewardClaimResult = {
  objekt: {
    collectionId: "Atom01 JinSoul 201Z",
    season: "Atom01",
    member: "JinSoul",
    collectionNo: "201Z",
    class: "Special",
    artists: ["artms"],
    thumbnailImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/543842fc-da51-429f-b095-6b429484e500/thumbnail",
    frontImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/543842fc-da51-429f-b095-6b429484e500/4x",
    backImage:
      "https://imagedelivery.net/qQuMkbHJ-0s6rwu8vup_5w/9aa7fc9d-976b-49ba-89ae-85d53333df00/4x",
    accentColor: "#F7F7F7",
    backgroundColor: "#F7F7F7",
    textColor: "#000000",
    comoAmount: 1,
    transferableByDefault: true,
    tokenId: "1252359",
    tokenAddress: "0x0fB69F54bA90f17578a59823E09e5a1f8F3FA200",
    objektNo: 21,
    transferable: true,
  },
  transaction: {
    txId: "",
    chainId: "",
    ref: "",
  },
};
