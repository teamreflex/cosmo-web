"use client";

import { wagmiConfig } from "@/lib/client/gravity/config";
import { WagmiProvider } from "wagmi";

type Props = {
  children: React.ReactNode;
};

/**
 * Can't create a wagmi config in RSC, so we need to do it in a client component.
 */
export default function GravityProvider({ children }: Props) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
