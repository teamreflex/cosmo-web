import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBinderDetail } from "@/hooks/use-binder-detail";
import type { BinderOptions } from "@/hooks/use-binder-detail";
import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { objektMetadataQuery, objektQuery } from "@/lib/queries/objekt-queries";
import {
  binderGrid,
  binderLayoutLabel,
  pocketObjektName,
  pocketsByPage,
} from "@/lib/universal/binders";
import type {
  BinderDetail,
  BinderLayout,
  BinderPages,
  BinderPreview,
} from "@/lib/universal/binders";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { IconShare3 } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Suspense, useDeferredValue } from "react";
import type { ComponentProps, ReactNode, RefObject } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import BinderCover from "./binder-cover";
import { BinderPage, PocketSleeve } from "./binder-page";

type ViewerMetaProps = ComponentProps<"span"> & {
  cover: BinderPreview;
  binderOptions: BinderOptions;
  /** layout and pages only, for a phone */
  short?: boolean;
};

/**
 * The line under the name: layout, pages, objekts and when it last changed.
 * Page and objekt counts come from the cover until the pages have loaded.
 */
export function ViewerMeta({
  cover,
  binderOptions,
  short = false,
  className,
  ...props
}: ViewerMetaProps) {
  return (
    <span
      {...props}
      className={cn(
        "truncate font-mono text-[10.5px] tracking-[0.12em] text-muted-foreground uppercase",
        className,
      )}
    >
      <Suspense fallback={metaLine(cover, null, short)}>
        <LoadedMeta cover={cover} binderOptions={binderOptions} short={short} />
      </Suspense>
    </span>
  );
}

function LoadedMeta({
  cover,
  binderOptions,
  short,
}: {
  cover: BinderPreview;
  binderOptions: BinderOptions;
  short: boolean;
}) {
  return metaLine(cover, useBinderDetail(binderOptions), short);
}

function metaLine(
  cover: BinderPreview,
  binder: BinderDetail | null,
  short: boolean,
) {
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
    if (binder !== null) {
      parts.push(
        m.binder_viewer_updated({
          date: format(binder.updatedAt, "d MMM yy"),
        }),
      );
    }
  }
  return parts.join(" · ");
}

type PocketsProps = {
  binderOptions: BinderOptions;
  page: number;
  /** load images eagerly, for the pages on screen when the viewer opens */
  priority?: boolean;
  /** tab order for the pocket buttons, so a copy of the page can drop out */
  tabIndex?: number;
};

type ViewerPageProps = Omit<ComponentProps<"div">, "children"> &
  PocketsProps & {
    layout: BinderLayout;
    /** skeleton pockets only, for a page too far from view to be swiped to next */
    placeholder?: boolean;
  };

/**
 * One page of the viewer: skeleton pockets while the binder loads, then a
 * button per filled pocket that opens the objekt dialog, and empty sleeves.
 * The page itself is drawn straight away, for the cover to land on, and its
 * pockets a render later, so a viewer opening with the binder already loaded
 * starts its animation as soon as one opening without it.
 */
export function ViewerPage({
  layout,
  binderOptions,
  page,
  priority,
  tabIndex,
  placeholder = false,
  ...props
}: ViewerPageProps) {
  const { pocketsPerPage } = binderGrid(layout);
  const mounted = useDeferredValue(true, false);
  const skeletons = Array.from({ length: pocketsPerPage }, (_, slot) => (
    <Skeleton key={`${page}-${slot}`} className="aspect-photocard rounded-md" />
  ));

  return (
    <BinderPage layout={layout} {...props}>
      {mounted && !placeholder ? (
        <Suspense fallback={skeletons}>
          <PagePockets
            binderOptions={binderOptions}
            page={page}
            pocketsPerPage={pocketsPerPage}
            priority={priority}
            tabIndex={tabIndex}
          />
        </Suspense>
      ) : (
        skeletons
      )}
    </BinderPage>
  );
}

function PagePockets({
  binderOptions,
  page,
  pocketsPerPage,
  priority = false,
  tabIndex,
}: PocketsProps & { pocketsPerPage: number }) {
  const { entries } = useBinderDetail(binderOptions);
  const pockets = pocketsByPage(entries).get(page);

  return Array.from({ length: pocketsPerPage }, (_, slot) => {
    const entry = pockets?.get(slot);
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
  });
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
      {/* a layer of its own from the start, so the hover lift doesn't make the page re-raster and re-decode its full-size images */}
      <button
        type="button"
        tabIndex={tabIndex}
        aria-label={m.binder_editor_pocket_filled({
          pocket: slot + 1,
          objekt: pocketObjektName(objekt),
        })}
        onClick={handleClick}
        className="block w-full rounded-photocard transition-transform duration-200 ease-out will-change-transform outline-none hover:-translate-y-0.5 focus-visible:shadow-[0_0_0_2px_var(--color-foreground)]"
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
      data-spread-rings
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

type RailProps = {
  layout: BinderLayout;
  pageCount: number;
  /** pages in the current view */
  current: number[];
  onSelect: (page: number) => void;
  className?: string;
};

/**
 * Every page as a dot map with its filled pockets lit, to jump anywhere
 * without flipping. The pages in view are outlined, and the pockets light up
 * once the binder loads.
 */
export function PageRail({
  binderOptions,
  ...rail
}: RailProps & { binderOptions: BinderOptions }) {
  return (
    <Suspense fallback={<Rail {...rail} pages={new Map()} />}>
      <LoadedRail binderOptions={binderOptions} {...rail} />
    </Suspense>
  );
}

function LoadedRail({
  binderOptions,
  ...rail
}: RailProps & { binderOptions: BinderOptions }) {
  const { entries } = useBinderDetail(binderOptions);
  return <Rail {...rail} pages={pocketsByPage(entries)} />;
}

function Rail({
  layout,
  pageCount,
  pages,
  current,
  onSelect,
  className,
}: RailProps & { pages: BinderPages }) {
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
 *
 * Once open, it can rest where it landed at an opacity too low to change a
 * pixel. It's still drawn, so its copy of the page stays rasterised with the
 * images uploaded, and closing swings it shut on the next frame instead of
 * waiting ~200 ms for the full-size images to upload again.
 */
export function ViewerLeaf({ flyRef, leafRef, cover, back }: LeafProps) {
  return (
    <div
      ref={flyRef}
      aria-hidden
      className="pointer-events-none absolute z-20 origin-top-left perspective-[2000px] not-data-leaf:hidden data-[leaf=resting]:opacity-[0.001]"
    >
      <div
        ref={leafRef}
        className="absolute inset-0 origin-left rounded-[inherit] transform-3d"
      >
        <div className="absolute inset-0 rounded-[inherit] backface-hidden">
          <BinderCover
            binder={cover}
            fill
            className="size-full rounded-[inherit]"
          />
        </div>
        {/* a pixel behind the cover rather than a hidden back face, so it's painted before the swing turns it over */}
        {back !== undefined && (
          <div className="absolute inset-0 -translate-z-px rotate-y-180">
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
