import { createContext, useContext } from "react";

export const MOBILE_BREAKPOINT = 768; // tailwind's md breakpoint

type ContextProps = {
  isDesktop: boolean;
};

export const MediaQueryContext = createContext<ContextProps | undefined>(
  undefined,
);

export function useMediaQuery() {
  const ctx = useContext(MediaQueryContext);
  if (ctx === undefined) {
    throw new Error("useMediaQuery must be used within a MediaQueryProvider");
  }

  return ctx.isDesktop;
}
