import { createContext, use, useCallback, useState } from "react";

/**
 * Stores whether or not the objekt grid has been measured.
 */
export const UnmeasuredGridContext = createContext(false);

/**
 * Handles fade-in for objekt images.
 */
export function useImageLoaded(initial: boolean) {
  const unmeasured = use(UnmeasuredGridContext);
  const [isLoaded, setIsLoaded] = useState(initial || unmeasured);

  const checkDecoded = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, []);

  return { isLoaded, checkDecoded, onLoad: () => setIsLoaded(true) };
}
