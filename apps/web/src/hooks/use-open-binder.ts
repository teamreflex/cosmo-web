import { binderQuery } from "@/lib/queries/binders";
import type { BinderPreview } from "@/lib/universal/binders";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

/**
 * The cover a binder was opened from, which the viewer's cover flies out of
 * and back into, and the preview it was drawn from.
 */
export type BinderViewerOrigin = {
  element: HTMLElement;
  preview: BinderPreview;
};

/**
 * An open made from inside the app, which pushed a history entry, so closing
 * can go back rather than push another.
 */
export type BinderViewerOpen = {
  slug: string;
  origin: BinderViewerOrigin | null;
};

let pendingOpen: BinderViewerOpen | null = null;

/**
 * Note that a binder is being opened from inside the app, for the viewer to
 * pick up as it mounts.
 */
export function markBinderOpen(open: BinderViewerOpen) {
  pendingOpen = open;
}

/**
 * Claim the in-app open for this binder, if there was one. It's handed out
 * once, so a later open from a shared link or the forward button is treated
 * as a fresh load.
 */
export function takeBinderOpen(slug: string) {
  const open = pendingOpen?.slug === slug ? pendingOpen : null;
  pendingOpen = null;
  return open;
}

/**
 * Open a binder in the profile's viewer by adding it to the URL, so back
 * closes it. Passing the clicked cover element makes the cover fly out of it.
 * `prefetch` starts loading the pages early, on hover or focus.
 */
export function useOpenBinder(userId: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function open(preview: BinderPreview, element?: HTMLElement) {
    markBinderOpen({
      slug: preview.slug,
      origin: element === undefined ? null : { element, preview },
    });
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, binder: preview.slug }),
      resetScroll: false,
    });
  }

  function prefetch(slug: string) {
    void queryClient.prefetchQuery(binderQuery(userId, slug));
  }

  return { open, prefetch };
}
