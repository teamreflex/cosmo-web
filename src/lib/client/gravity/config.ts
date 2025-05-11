import { http, createConfig } from "wagmi";
import { abstract } from "wagmi/chains";

/**
 * wagmi.sh config for reading from the Abstract RPC.
 */
export const abstractRPCConfig = createConfig({
  ssr: true,
  chains: [abstract],
  transports: {
    [abstract.id]: http(`https://api.mainnet.abs.xyz`, {
      name: "abstract",
      batch: true,
    }),
  },
});
