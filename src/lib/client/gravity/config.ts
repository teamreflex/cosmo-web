import { env } from "@/env";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
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
          Authorization: `Bearer ${env.NEXT_PUBLIC_ALCHEMY_KEY}`,
          // Authorization: `Bearer ${env.NEXT_PUBLIC_COSMO_ALCHEMY_KEY}`,
        },
      },
    }),
  },
});

/**
 * wagmi.sh config for reading from Polygon via COSMO's proxy.
 */
export function createCosmoProxyConfig(accessToken: string) {
  return createConfig({
    ssr: true,
    chains: [polygon],
    transports: {
      [polygon.id]: http(`${COSMO_ENDPOINT}/bff/v1/jsonrpc-proxy`, {
        name: "cosmo-proxy",
        fetchOptions: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      }),
    },
  });
}
