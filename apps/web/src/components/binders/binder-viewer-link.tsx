import { markBinderOpen, useOpenBinder } from "@/hooks/use-open-binder";
import { m } from "@/i18n/messages";
import type { BinderPreview } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { MouseEvent, ReactNode } from "react";

type Props = {
  /** the binder owner's user id, which keys the binder query */
  userId: string;
  binder: BinderPreview;
  className?: string;
  children: ReactNode;
};

/**
 * Wraps a binder cover so clicking it opens the profile's binder viewer, with
 * the cover flying out of this element. It's a real link to the share URL, so
 * it also opens in a new tab. Hovering or focusing it prefetches the pages.
 */
export default function BinderViewerLink({
  userId,
  binder,
  className,
  children,
}: Props) {
  const { prefetch } = useOpenBinder(userId);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // modified clicks open a new tab, which has nothing to fly from
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    markBinderOpen({
      slug: binder.slug,
      origin: { element: event.currentTarget, preview: binder },
    });
  }

  return (
    <Link
      to="."
      search={(prev) => ({ ...prev, binder: binder.slug })}
      resetScroll={false}
      aria-label={m.binder_viewer_open({ name: binder.name })}
      onClick={handleClick}
      onMouseEnter={() => prefetch(binder.slug)}
      onFocus={() => prefetch(binder.slug)}
      className={cn(
        "block rounded-photocard outline-none focus-visible:ring-2 focus-visible:ring-cosmo-text focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      {children}
    </Link>
  );
}
