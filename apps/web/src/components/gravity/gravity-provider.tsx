import { WagmiProvider } from "wagmi";
import type { ReactNode } from "react";
import { wagmiConfig } from "@/lib/client/gravity/config";

type Props = {
  children: ReactNode;
};

/**
 * Can't create a wagmi config in RSC, so we need to do it in a client component.
 */
export default function GravityProvider({ children }: Props) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
