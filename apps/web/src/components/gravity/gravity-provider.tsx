import type { ReactNode } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { abstract } from "wagmi/chains";

type Props = {
  children: ReactNode;
};

export default function GravityProvider({ children }: Props) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}

/**
 * wagmi.sh config for reading from the Abstract RPC.
 */
const config = createConfig({
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
    config: typeof config;
  }
}
