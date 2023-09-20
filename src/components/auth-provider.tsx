"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import {
  init,
  AUTH_PROVIDER,
  THEME,
  SUPPORTED_POLYGON_NETWORKS,
} from "@ramper/ethereum";

type Props = PropsWithChildren;

export default function AuthProvider({ children }: Props) {
  useEffect(() => {
    init({
      appId: "alzeakpmqx",
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
