import { env } from "@/env";
import { http, createConfig } from "wagmi";
import { polygon } from "wagmi/chains";

/**
 * wagmi.sh config for reading from Polygon via COSMO's Alchemy key.
 */
export const cosmoAlchemyConfig = createConfig({
  ssr: true,
  chains: [polygon],
  transports: {
    [polygon.id]: http(`https://polygon-mainnet.g.alchemy.com/v2`, {
      name: "alchemy-cosmo",
      batch: true,
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${env.NEXT_PUBLIC_COSMO_ALCHEMY_KEY}`,
        },
      },
    }),
  },
});
