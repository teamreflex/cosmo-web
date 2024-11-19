"use client";

import { ReactNode, createContext, useContext } from "react";
import { useMediaQuery as _useMediaQuery } from "usehooks-ts";

type ContextProps = {
  isDesktop: boolean;
};

const MediaQueryContext = createContext<ContextProps | undefined>(undefined);

type ProviderProps = {
  children: ReactNode;
};

export function MediaQueryProvider({ children }: ProviderProps) {
  const isDesktop = _useMediaQuery("(min-width: 768px)");

  return (
    <MediaQueryContext value={{ isDesktop }}>{children}</MediaQueryContext>
  );
}

export function useMediaQuery() {
  const ctx = useContext(MediaQueryContext);
  if (ctx === undefined) {
    throw new Error("useMediaQuery must be used within a MediaQueryProvider");
  }

  return ctx.isDesktop;
}
