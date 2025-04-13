"use client";

import { cosmoAlchemyConfig } from "@/lib/client/gravity/config";
import { WagmiProvider } from "wagmi";

type Props = {
  authenticated: boolean;
  accessToken: string;
  children: React.ReactNode;
};

/**
 * Can't create a wagmi config in RSC, so we need to do it in a client component.
 */
export default function GravityWagmiProvider({
  authenticated,
  accessToken,
  children,
}: Props) {
  // if signed in, use the cosmo proxy. otherwise use alchemy
  // const config = authenticated
  //   ? createCosmoProxyConfig(accessToken)
  //   : cosmoAlchemyConfig;

  return <WagmiProvider config={cosmoAlchemyConfig}>{children}</WagmiProvider>;
}
