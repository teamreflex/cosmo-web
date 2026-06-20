import { MediaQueryContext } from "@/hooks/use-media-query";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";

type ProviderProps = {
  children: ReactNode;
};

const MOBILE_BREAKPOINT = 768; // tailwind's sm breakpoint

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function MediaQueryProvider({ children }: ProviderProps) {
  // subscribe to the breakpoint as an external store; server snapshot defaults to desktop
  const isMobile = useSyncExternalStore(
    subscribe,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );

  return (
    <MediaQueryContext value={{ isDesktop: !isMobile }}>
      {children}
    </MediaQueryContext>
  );
}
