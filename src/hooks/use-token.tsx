"use client";

import { TokenPayload } from "@/lib/universal/auth";
import { createContext, useContext } from "react";

type Context = {
  token: TokenPayload | undefined;
};

const context = createContext<Context>({
  token: undefined,
});

type TokenProviderProps = {
  children: React.ReactNode;
  token: TokenPayload | undefined;
};

export function TokenProvider({ children, token }: TokenProviderProps) {
  return <context.Provider value={{ token }}>{children}</context.Provider>;
}

export function useToken() {
  const ctx = useContext(context);
  if (!ctx) {
    throw new Error("useToken must be used within a TokenProvider");
  }

  return ctx.token;
}
