import { createContext, useContext } from "react";

export type OpenMetadataDialogOptions = {
  serial?: number;
};

export type MetadataDialogContextValue = {
  open: (slug: string, options?: OpenMetadataDialogOptions) => void;
  close: () => void;
  currentSlug: string | null;
};

export const MetadataDialogContext =
  createContext<MetadataDialogContextValue | null>(null);

/**
 * Imperative handle for the shared metadata Sheet. `open(slug)` opens the
 * dialog; passing `{ serial }` also pre-fills the serial input and lands on
 * the serials tab regardless of URL navigation timing.
 */
export function useMetadataDialog() {
  const ctx = useContext(MetadataDialogContext);
  if (!ctx) {
    throw new Error(
      "useMetadataDialog must be used within MetadataDialogProvider",
    );
  }
  return ctx;
}
