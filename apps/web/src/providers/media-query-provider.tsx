import { MediaQueryContext } from "@/hooks/use-media-query";
import { useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";

type ProviderProps = {
  children: ReactNode;
};

const MOBILE_BREAKPOINT = 768; // tailwind's sm breakpoint

export function MediaQueryProvider({ children }: ProviderProps) {
  const [isMobile, setIsMobile] = useState<boolean>();

  useLayoutEffect(() => {
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
