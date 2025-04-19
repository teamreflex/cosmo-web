"use client";

import { cosmoAlchemyConfig } from "@/lib/client/gravity/config";
import { WagmiProvider } from "wagmi";

type Props = {
  children: React.ReactNode;
};

/**
 * Can't create a wagmi config in RSC, so we need to do it in a client component.
 */
export default function GravityWagmiProvider({ children }: Props) {
  return <WagmiProvider config={cosmoAlchemyConfig}>{children}</WagmiProvider>;
}
