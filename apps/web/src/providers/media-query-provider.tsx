import { MediaQueryContext, MOBILE_BREAKPOINT } from "@/hooks/use-media-query";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";

type ProviderProps = {
  children: ReactNode;
};

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

export function MediaQueryProvider({ children }: ProviderProps) {
  /**
   * Subscribe to the breakpoint as an external store; the server snapshot defaults to desktop.
   * The snapshot reads the media query, not `window.innerWidth`: a phone widens `innerWidth` to fit content
   * that overflows the screen, so it would follow whatever the breakpoint made the page render.
   */
  const isMobile = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  );

  return (
    <MediaQueryContext value={{ isDesktop: !isMobile }}>
      {children}
    </MediaQueryContext>
  );
}
