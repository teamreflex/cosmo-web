import { createContext, useContext } from "react";

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
