import type { BinderPreview } from "@/lib/universal/binders";
import { createContext, useContext } from "react";

/**
 * Where a binder was opened from: the control that gets focus back, the cover
 * on screen the viewer's cover flies out of and back into, and the preview it
 * was drawn from.
 */
export type BinderViewerOrigin = {
  element: HTMLElement;
  cover: HTMLElement;
  preview: BinderPreview;
};

export type BinderViewerContextValue = {
  open: (
    preview: BinderPreview,
    element?: HTMLElement,
    cover?: HTMLElement,
  ) => void;
  prefetch: (preview: BinderPreview) => void;
};

export const BinderViewerContext =
  createContext<BinderViewerContextValue | null>(null);

/**
 * Open a binder in the profile's viewer. Passing the clicked element makes the
 * cover fly out of it, or out of `cover` when the cover drawn inside it moves
 * on its own, such as lifting on hover. `prefetch` starts loading the pages
 * early, on hover or focus.
 */
export function useOpenBinder() {
  const ctx = useContext(BinderViewerContext);
  if (!ctx) {
    throw new Error("useOpenBinder must be used within BinderViewerProvider");
  }
  return ctx;
}
