import { useOpenBinder } from "@/hooks/use-open-binder";
import { m } from "@/i18n/messages";
import type { BinderPreview } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { MouseEvent, ReactNode } from "react";

type Props = {
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
  binder,
  className,
  children,
}: Props) {
  const { open, prefetch } = useOpenBinder();

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
    // the viewer opens straight away, rather than waiting on the router
    event.preventDefault();
    open(binder, event.currentTarget);
  }

  return (
    <Link
      to="."
      search={(prev) => ({ ...prev, binder: binder.slug })}
      aria-label={m.binder_viewer_open({ name: binder.name })}
      onClick={handleClick}
      onMouseEnter={() => prefetch(binder)}
      onFocus={() => prefetch(binder)}
      className={cn("block rounded-photocard outline-none", className)}
    >
      {children}
    </Link>
  );
}
