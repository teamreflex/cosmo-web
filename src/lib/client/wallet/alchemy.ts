import { env } from "@/env.mjs";
import { http } from "wagmi";

export const alchemyHttpTransport = http(
  `https://polygon-mainnet.g.alchemy.com/v2`,
  {
    batch: true,
    fetchOptions: {
      headers: {
        Authorization: `Bearer ${env.NEXT_PUBLIC_ALCHEMY_KEY}`,
      },
    },
  }
);
