import { ObjektSidebar } from "@/components/objekt/common";
import { getObjektFrontImageRef } from "@/lib/client/objekt-util";
import { env } from "@/lib/env/client";
import { binderGrid } from "@/lib/universal/binders";
import type {
  BinderLayout,
  BinderObjekt,
  BinderPocketEntry,
} from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import { objektImageUrl } from "@apollo/image";
import { slugifyObjekt } from "@apollo/util";
import type { ComponentProps } from "react";

type BinderPageProps = ComponentProps<"div"> & {
  layout: BinderLayout;
};

/**
 * One binder page: the paper and its grid of pockets, laid out by the
 * binder's layout. Shared by the editor and the viewer.
 */
export function BinderPage({
  layout,
  className,
  children,
  ...props
}: BinderPageProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-linear-to-b from-foreground/[0.07] to-foreground/[0.04] p-2.5 md:p-4.5",
        className,
      )}
      {...props}
    >
      <div
        className="grid gap-2 md:gap-2.5"
        style={{
          gridTemplateColumns: `repeat(${binderGrid(layout).columns}, minmax(0, 1fr))`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

type PageThumbnailProps = {
  layout: BinderLayout;
  /** the page's filled pockets by slot */
  pockets: ReadonlyMap<number, BinderPocketEntry> | undefined;
  /** outline it as a page on screen */
  current?: boolean;
  className?: string;
};

/**
 * A page in miniature for the viewer's rail and the editor's strip: a tiny card
 * per pocket, each filled one tinted with its objekt's background colour, so
 * pages tell apart at a glance. Its border follows the hover and keyboard
 * focus of the `group` button it sits in.
 */
export function PageThumbnail({
  layout,
  pockets,
  current = false,
  className,
}: PageThumbnailProps) {
  const { columns, pocketsPerPage } = binderGrid(layout);

  return (
    <span
      aria-hidden
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      className={cn(
        "grid w-11 gap-0.5 rounded-md border border-border bg-muted/60 p-1 transition-colors group-hover:border-foreground/30 group-focus-visible:border-foreground",
        current &&
          "border-cosmo-text shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-cosmo)_30%,transparent)] group-hover:border-cosmo-text",
        className,
      )}
    >
      {Array.from({ length: pocketsPerPage }, (_, slot) => {
        const entry = pockets?.get(slot);
        return (
          // its own container, so the corners scale with it like a photocard's
          <span key={slot} className="@container">
            <i
              style={
                entry === undefined
                  ? undefined
                  : { backgroundColor: entry.objekt.backgroundColor }
              }
              // ringed, so a dark objekt still reads as filled on a dark page
              className={cn(
                "block aspect-photocard rounded-photocard bg-foreground/8",
                entry !== undefined && "ring-1 ring-foreground/25 ring-inset",
              )}
            />
          </span>
        );
      })}
    </span>
  );
}

type PocketSleeveProps = {
  objekt: BinderObjekt | undefined;
  /** load the image eagerly, for the first page on screen */
  priority?: boolean;
  className?: string;
};

/**
 * A pocket drawn as a translucent sleeve with a sheen across it, so an empty
 * pocket still reads as a pocket. Empty sleeves show a faint diagonal weave.
 */
export function PocketSleeve({
  objekt,
  priority = false,
  className,
}: PocketSleeveProps) {
  return (
    <div className={cn("@container", className)}>
      <div
        className={cn(
          "relative aspect-photocard overflow-hidden rounded-photocard border border-foreground/7 bg-foreground/[0.035] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[linear-gradient(160deg,rgb(255_255_255/0.10),transparent_35%,transparent_65%,rgb(255_255_255/0.04))]",
          objekt === undefined &&
            "before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(255_255_255/0.025)_6px_7px)]",
        )}
      >
        {objekt !== undefined && (
          <PocketObjekt objekt={objekt} priority={priority} />
        )}
      </div>
    </div>
  );
}

function PocketObjekt({
  objekt,
  priority,
}: {
  objekt: BinderObjekt;
  priority: boolean;
}) {
  const [artist] = objekt.artists;
  const ref = getObjektFrontImageRef({
    slug: slugifyObjekt(objekt.collectionId),
    frontImageVersion: objekt.frontImageVersion,
  });

  return (
    <div
      style={{
        "--objekt-background-color": objekt.backgroundColor,
        "--objekt-text-color": objekt.textColor,
      }}
      className="absolute inset-0"
    >
      <img
        src={
          ref === null ? undefined : objektImageUrl(env.VITE_CDN_URL, ref, "xs")
        }
        alt={objekt.collectionId}
        width={291}
        height={450}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className="size-full object-cover"
      />
      {artist !== undefined && (
        <ObjektSidebar
          collection={{ ...objekt, artist }}
          serial={objekt.objektNo}
        />
      )}
    </div>
  );
}
