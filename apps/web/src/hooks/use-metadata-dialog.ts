import { createContext, useContext } from "react";

export type MetadataDialogContextValue = {
  open: () => void;
};

export const MetadataDialogContext =
  createContext<MetadataDialogContextValue | null>(null);

export function useMetadataDialog() {
  const ctx = useContext(MetadataDialogContext);
  if (!ctx) {
    throw new Error(
      "useMetadataDialog must be used within MetadataDialog component",
    );
  }
  return ctx;
}
