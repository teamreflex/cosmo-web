"use client";

import { PropsWithChildren, useEffect } from "react";
import {
  init,
  AUTH_PROVIDER,
  THEME,
  SUPPORTED_POLYGON_NETWORKS,
} from "@ramper/ethereum";
import { env } from "@/env.mjs";

type Props = PropsWithChildren;

export default function AuthProvider({ children }: Props) {
  useEffect(() => {
    init({
      appId: env.NEXT_PUBLIC_COSMO_APP_ID,
      appName: "Cosmo",
      authProviders: [AUTH_PROVIDER.EMAIL],
      issueIdToken: true,
      network: SUPPORTED_POLYGON_NETWORKS.MAINNET,
      theme: THEME.DARK,
    });
    console.log("ramper init");
  }, []);

  return <>{children}</>;
}
