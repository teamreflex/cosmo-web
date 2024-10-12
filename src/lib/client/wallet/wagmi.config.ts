import { createConfig } from "wagmi";
import { polygon } from "wagmi/chains";
import { alchemyHttpTransport } from "./alchemy";
import { ramper } from "./ramper-connector";

export const config = createConfig({
  chains: [polygon],
  connectors: [ramper()],
  transports: {
    [polygon.id]: alchemyHttpTransport,
  },
  ssr: true,
});
