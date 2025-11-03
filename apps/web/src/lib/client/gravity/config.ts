import { createConfig, http } from "wagmi";
import { abstract } from "wagmi/chains";

/**
 * wagmi.sh config for reading from the Abstract RPC.
 */
export const wagmiConfig = createConfig({
  ssr: true,
  chains: [abstract],
  transports: {
    [abstract.id]: http(`https://api.mainnet.abs.xyz`, {
      name: "abstract",
      batch: true,
    }),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
