import BinderViewer from "@/components/binders/binder-viewer";
import { BinderViewerContext } from "@/hooks/use-open-binder";
import type { BinderViewerOrigin } from "@/hooks/use-open-binder";
import { binderQuery } from "@/lib/queries/binders";
import type { BinderPreview } from "@/lib/universal/binders";
import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useMatches, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { ReactNode } from "react";

const route = getRouteApi("/@{$username}");

/**
 * The binder showing in the viewer. `key` is new for every open, so a binder
 * opened while another is still animating shut starts a viewer of its own.
 * `origin` is null when it was opened from the URL, with no cover on screen to
 * fly from.
 */
export type BinderViewerState = {
  key: number;
  slug: string;
  origin: BinderViewerOrigin | null;
  closing: boolean;
};

type Props = {
  /** the profile's Apollo account, which binders belong to */
  userId: string | undefined;
  /** the identifier the profile routes under */
  username: string;
  isOwner: boolean;
  children: ReactNode;
};

/**
 * Mounts the profile's binder viewer over every tab. It opens and closes as
 * soon as it's asked to, and `?binder=` mirrors it so the URL shares it and a
 * shared link opens it. Consumers open it with `useOpenBinder().open()`.
 */
export function BinderViewerProvider({
  userId,
  username,
  isOwner,
  children,
}: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const slug = route.useSearch({ select: (search) => search.binder });
  const pathname = useMatches({
    select: (matches) => matches.at(-1)?.pathname,
  });
  const [viewer, setViewer] = useState<BinderViewerState | null>(() =>
    slug === undefined ? null : { key: 0, slug, origin: null, closing: false },
  );

  /**
   * Arriving from another page follows its `?binder=`, such as the editor's
   * Done button or going back from the editor. Leaving for one takes the
   * viewer down with it, with nothing left to animate back to.
   */
  const [page, setPage] = useState(pathname);
  if (pathname !== page) {
    setPage(pathname);
    if (slug === undefined) {
      setViewer(null);
    } else if (viewer === null || viewer.closing || viewer.slug !== slug) {
      setViewer({
        key: (viewer?.key ?? 0) + 1,
        slug,
        origin: null,
        closing: false,
      });
    }
  }

  function mirror(binder: string | undefined) {
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, binder }),
      replace: true,
      resetScroll: false,
    });
  }

  function open(
    preview: BinderPreview,
    element?: HTMLElement,
    cover = element,
  ) {
    setViewer((current) => ({
      key: (current?.key ?? 0) + 1,
      slug: preview.slug,
      origin:
        element === undefined || cover === undefined
          ? null
          : { element, cover, preview },
      closing: false,
    }));
    mirror(preview.slug);
  }

  function prefetch(preview: BinderPreview) {
    void queryClient.prefetchQuery(binderQuery(preview.userId, preview.slug));
  }

  function close() {
    setViewer((current) =>
      current === null || current.closing
        ? current
        : { ...current, closing: true },
    );
    mirror(undefined);
  }

  return (
    <BinderViewerContext.Provider value={{ open, prefetch }}>
      {children}

      {userId !== undefined && viewer !== null && (
        <BinderViewer
          key={viewer.key}
          userId={userId}
          username={username}
          isOwner={isOwner}
          viewer={viewer}
          onClose={close}
          // a newer viewer has taken over when the key doesn't match
          onClosed={() =>
            setViewer((current) =>
              current?.key === viewer.key ? null : current,
            )
          }
        />
      )}
    </BinderViewerContext.Provider>
  );
}
