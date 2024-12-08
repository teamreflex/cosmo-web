"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type ContextProps = {
  isDesktop: boolean;
};

const MediaQueryContext = createContext<ContextProps | undefined>(undefined);

type ProviderProps = {
  children: ReactNode;
};

const MOBILE_BREAKPOINT = 768;

export function MediaQueryProvider({ children }: ProviderProps) {
  const [isMobile, setIsMobile] = useState<boolean>();

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return (
    <MediaQueryContext value={{ isDesktop: !isMobile }}>
      {children}
    </MediaQueryContext>
  );
}

export function useMediaQuery() {
  const ctx = useContext(MediaQueryContext);
  if (ctx === undefined) {
    throw new Error("useMediaQuery must be used within a MediaQueryProvider");
  }

  return ctx.isDesktop;
}
