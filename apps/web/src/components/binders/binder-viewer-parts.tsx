import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { objektMetadataQuery, objektQuery } from "@/lib/queries/objekt-queries";
import {
  binderGrid,
  binderLayoutLabel,
  pocketObjektName,
} from "@/lib/universal/binders";
import type {
  BinderDetail,
  BinderLayout,
  BinderPages,
  BinderPocketEntry,
  BinderPreview,
} from "@/lib/universal/binders";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { IconShare3 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import BinderCover from "./binder-cover";
import { BinderPage, PocketSleeve } from "./binder-page";

/**
 * The line under the name: layout, pages, objekts and when it last changed.
 * Page and objekt counts come from the cover until the pages have loaded.
 */
export function ViewerMeta({
  cover,
  binder,
  short = false,
  className,
}: {
  cover: BinderPreview;
  binder: BinderDetail | undefined;
  /** layout and pages only, for a phone */
  short?: boolean;
  className?: string;
}) {
  const parts = [
    binderLayoutLabel(cover.layout),
    m.binder_page_count({ count: binder?.pageCount ?? cover.pageCount }),
  ];
  if (!short) {
    parts.push(
      m.binder_viewer_objekt_count({
        count: binder?.entries.length ?? cover.entryCount,
      }),
    );
    if (binder !== undefined) {
      parts.push(
        m.binder_viewer_updated({
          date: format(binder.updatedAt, "d MMM yy"),
        }),
      );
    }
  }

  return (
    <span
      className={cn(
        "truncate font-mono text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase",
        className,
      )}
    >
      {parts.join(" · ")}
    </span>
  );
}

type ViewerPageProps = Omit<ComponentProps<"div">, "children"> & {
  layout: BinderLayout;
  /** the page's pockets, or undefined while the pages load */
  pockets: Map<number, BinderPocketEntry> | undefined;
  page: number;
  /** load images eagerly, for the pages on screen when the viewer opens */
  priority?: boolean;
  /** tab order for the pocket buttons, so a copy of the page can drop out */
  tabIndex?: number;
};

/**
 * One page of the viewer: skeleton pockets while it loads, then a button per
 * filled pocket that opens the objekt dialog, and empty sleeves.
 */
export function ViewerPage({
  layout,
  pockets,
  page,
  priority = false,
  tabIndex,
  ...props
}: ViewerPageProps) {
  const { pocketsPerPage } = binderGrid(layout);

  return (
    <BinderPage layout={layout} {...props}>
      {Array.from({ length: pocketsPerPage }, (_, slot) => {
        if (pockets === undefined) {
          return (
            <Skeleton
              key={`${page}-${slot}`}
              className="aspect-photocard rounded-md"
            />
          );
        }

        const entry = pockets.get(slot);
        return entry === undefined ? (
          <div
            key={`${page}-${slot}`}
            role="img"
            aria-label={m.binder_editor_pocket_empty({ pocket: slot + 1 })}
          >
            <PocketSleeve objekt={undefined} />
          </div>
        ) : (
          <ViewerPocket
            key={`${page}-${slot}-${entry.objekt.tokenId}`}
            slot={slot}
            objekt={entry.objekt}
            priority={priority}
            tabIndex={tabIndex}
          />
        );
      })}
    </BinderPage>
  );
}

type ViewerPocketProps = {
  slot: number;
  objekt: CosmoObjekt;
  priority: boolean;
  tabIndex: number | undefined;
};

function ViewerPocket({ slot, objekt, priority, tabIndex }: ViewerPocketProps) {
  const queryClient = useQueryClient();
  const { open } = useMetadataDialog();

  function handleClick() {
    // seed the collection and start the metadata request, as grid objekts do
    const { collection } = Objekt.fromLegacy(objekt);
    queryClient.setQueryData(objektQuery(collection.slug).queryKey, collection);
    void queryClient.prefetchQuery(objektMetadataQuery(collection.slug));
    open(collection.slug);
  }

  return (
    <div className="@container">
      <button
        type="button"
        tabIndex={tabIndex}
        aria-label={m.binder_editor_pocket_filled({
          pocket: slot + 1,
          objekt: pocketObjektName(objekt),
        })}
        onClick={handleClick}
        className="block w-full rounded-photocard transition-transform duration-200 ease-out outline-none hover:-translate-y-0.5 focus-visible:shadow-[0_0_0_2px_var(--color-foreground)]"
      >
        <PocketSleeve objekt={objekt} priority={priority} />
      </button>
    </div>
  );
}

/**
 * The binder rings down the middle of a spread.
 */
export function SpreadRings() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-1/2 z-2 w-0"
    >
      {[12, 38, 62, 88].map((top) => (
        <span
          key={top}
          style={{ top: `calc(${top}% - 9px)` }}
          className="absolute -left-2.25 size-4.5 rounded-full border-3 border-zinc-600 bg-background shadow-[0_2px_4px_rgb(0_0_0/0.6)]"
        />
      ))}
    </div>
  );
}

type PageRailProps = {
  layout: BinderLayout;
  pageCount: number;
  pages: BinderPages;
  /** pages in the current view */
  current: number[];
  onSelect: (page: number) => void;
  className?: string;
};

/**
 * Every page as a dot map with its filled pockets lit, to jump anywhere
 * without flipping. The pages in view are outlined.
 */
export function PageRail({
  layout,
  pageCount,
  pages,
  current,
  onSelect,
  className,
}: PageRailProps) {
  const { columns, pocketsPerPage } = binderGrid(layout);

  return (
    <nav
      aria-label={m.binder_viewer_pages()}
      className={cn("no-scrollbar flex gap-2 overflow-x-auto p-1", className)}
    >
      {Array.from({ length: pageCount }, (_, page) => {
        const on = current.includes(page);
        return (
          <button
            key={page}
            type="button"
            aria-label={m.binder_viewer_go_to_page({ page: page + 1 })}
            aria-current={on ? "page" : undefined}
            onClick={() => onSelect(page)}
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            className={cn(
              "grid w-11 shrink-0 gap-0.5 rounded-md border border-border bg-muted/60 p-1 transition-colors outline-none hover:border-foreground/30 focus-visible:border-foreground",
              on &&
                "border-cosmo-text shadow-[0_0_0_2px_color-mix(in_oklch,var(--color-cosmo)_30%,transparent)] hover:border-cosmo-text",
            )}
          >
            {Array.from({ length: pocketsPerPage }, (_, slot) => (
              <i
                key={slot}
                className={cn(
                  "block aspect-[5.5/7] rounded-[2px] bg-foreground/8",
                  pages.get(page)?.has(slot) === true && "bg-cosmo-text",
                )}
              />
            ))}
          </button>
        );
      })}
    </nav>
  );
}

type LeafProps = {
  flyRef: RefObject<HTMLDivElement | null>;
  leafRef: RefObject<HTMLDivElement | null>;
  cover: BinderPreview;
  /** the page the cover's inside lands on, when there is one */
  back?: ReactNode;
};

/**
 * The binder's front cover as a leaf that swings open on its spine: the front
 * face is the cover, and the back face is the left page, so the leaf lands
 * exactly on it. It stays hidden until an animation places and shows it.
 */
export function ViewerLeaf({ flyRef, leafRef, cover, back }: LeafProps) {
  return (
    <div
      ref={flyRef}
      aria-hidden
      className="pointer-events-none absolute z-20 origin-top-left perspective-[2000px] not-data-flying:hidden"
    >
      <div ref={leafRef} className="absolute inset-0 origin-left transform-3d">
        <div className="absolute inset-0 backface-hidden">
          <BinderCover binder={cover} fill className="size-full" />
        </div>
        {back !== undefined && (
          <div className="absolute inset-0 rotate-y-180 backface-hidden">
            {back}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Copies the binder's share link, which opens the profile with it showing.
 */
export function ShareButton({
  username,
  slug,
  className,
}: {
  username: string;
  slug: string;
  className?: string;
}) {
  const [, copy] = useCopyToClipboard();

  function share() {
    const scheme = env.VITE_APP_ENV === "development" ? "http" : "https";
    void copy(
      `${scheme}://${env.VITE_BASE_URL}/@${username}?binder=${encodeURIComponent(slug)}`,
    );
    toast.success(m.binder_viewer_link_copied());
  }

  return (
    <Button variant="outline" size="sm" onClick={share} className={className}>
      <IconShare3 />
      {m.binder_viewer_share()}
    </Button>
  );
}
