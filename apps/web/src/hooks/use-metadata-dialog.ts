import type { ObjektMetadataTab } from "@/components/objekt/metadata/common";
import { createContext, useContext } from "react";

/**
 * Where the sheet lands when opened: a serial pre-fills the serial input on
 * the serials tab, and a tab opens that tab directly.
 */
export type MetadataDialogTarget =
  | { type: "serial"; serial: number }
  | { type: "tab"; tab: ObjektMetadataTab };

export type MetadataDialogContextValue = {
  open: (slug: string, target?: MetadataDialogTarget) => void;
  close: () => void;
};

export const MetadataDialogContext =
  createContext<MetadataDialogContextValue | null>(null);

/**
 * Imperative handle for the shared metadata Sheet. `open(slug)` opens the
 * dialog; a serial target also pre-fills the serial input and lands on the
 * serials tab regardless of URL navigation timing.
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
