"use client";

import { UserContext } from "@/context/user";
import { TokenPayload } from "@/lib/server/jwt";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  user: TokenPayload;
}>;

export function ProviderHelper({ user, children }: Props) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
