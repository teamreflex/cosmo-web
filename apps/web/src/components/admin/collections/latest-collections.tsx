import {
  getVariantGradient,
  getVariantRibbon,
} from "@/components/objekt/variant-gradients";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { latestCollectionsQuery } from "@/lib/queries/collections";
import { cn } from "@/lib/utils";
import type { Collection } from "@apollo/database/indexer/types";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { startTransition, useEffect, useRef, useState } from "react";

type Props = {
  selectedSlug: string;
  onSelect: (slug: string) => void;
};

export default function LatestCollections({ selectedSlug, onSelect }: Props) {
  const [page, setPage] = useState(0);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(latestCollectionsQuery());

  const pageIndex = Math.min(page, data.pages.length - 1);
  const current = data.pages[pageIndex];
  if (!current) {
    return null;
  }

  function handleNext() {
    startTransition(async () => {
      // only fetch when stepping past the pages already in the cache
      if (pageIndex + 1 >= data.pages.length) {
        await fetchNextPage();
      }
      setPage(pageIndex + 1);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {m.admin_latest_collections()}
        </h2>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {pageIndex * current.perPage + 1}&ndash;
            {pageIndex * current.perPage + current.collections.length}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.admin_latest_prev()}
            disabled={pageIndex === 0}
            onClick={() => setPage(pageIndex - 1)}
          >
            <IconChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={m.admin_latest_next()}
            disabled={
              isFetchingNextPage ||
              (pageIndex === data.pages.length - 1 && !hasNextPage)
            }
            onClick={handleNext}
          >
            <IconChevronRight />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-2.5 transition-opacity sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6",
          isFetchingNextPage && "opacity-60",
        )}
      >
        {current.collections.map((collection) => (
          <CollectionChip
            key={collection.id}
            collection={collection}
            isSelected={collection.slug === selectedSlug}
            onSelect={() => onSelect(collection.slug)}
          />
        ))}
      </div>
    </div>
  );
}

export function LatestCollectionsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: 24 }, (_, i) => (
          <Skeleton key={i} className="h-18 rounded-sm" />
        ))}
      </div>
    </div>
  );
}

function CollectionChip({
  collection,
  isSelected,
  onSelect,
}: {
  collection: Collection;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const background = collection.backgroundColor || "#333";
  const variantGradient = getVariantGradient(collection);
  const variantRibbon = getVariantRibbon(collection);
  const tileBackground = variantGradient
    ? `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.8) 100%), repeating-linear-gradient(135deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 8px), ${variantGradient}`
    : `linear-gradient(180deg, ${background}33 0%, ${background}08 60%, rgba(0,0,0,.35) 100%), repeating-linear-gradient(135deg, ${background}14 0 2px, transparent 2px 8px)`;
  const ribbonBackground = variantRibbon ?? background;

  return (
    <button
      type="button"
      onClick={onSelect}
      title={collection.collectionId}
      className={cn(
        "flex h-18 overflow-hidden rounded-sm border border-border transition-shadow hover:shadow-md",
        isSelected && "border-cosmo ring-2 ring-cosmo/25",
      )}
    >
      <ChipThumbnail
        src={collection.thumbnailImage}
        alt={collection.collectionId}
      />
      <div
        className="relative flex min-w-0 flex-1 flex-col items-start justify-between px-2 py-1.5 dark:[&>*]:[text-shadow:_0_1px_2px_rgba(0,0,0,0.9)]"
        style={{ background: tileBackground }}
      >
        <div className="font-mono text-[9px] font-bold tracking-widest text-foreground uppercase">
          {collection.season}
        </div>
        <div className="max-w-full truncate font-cosmo text-sm leading-none font-black text-foreground uppercase">
          {collection.member}
        </div>
        <div className="font-mono text-xs text-foreground tabular-nums">
          {collection.collectionNo}
        </div>
      </div>
      <div className="w-3 shrink-0" style={{ background: ribbonBackground }} />
    </button>
  );
}

/**
 * Draws the card face into a chip-sized canvas once. Recent collections have
 * no real thumbnail (resources.cosmo.fans only serves the 2000px front image),
 * and an <img> that big at chip size makes Chrome re-decode ~23MB of pixels
 * per chip on every repaint, saturating the raster threads. Decoding once
 * into a 96x144 bitmap eliminates the churn.
 */
function ChipThumbnail({ src, alt }: { src: string; alt: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    const img = new Image();
    img.src = src;
    img
      .decode()
      .then(() => {
        if (cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // object-cover anchored to the top of the card face
        const scale = Math.max(
          canvas.width / img.naturalWidth,
          canvas.height / img.naturalHeight,
        );
        ctx.drawImage(
          img,
          (canvas.width - img.naturalWidth * scale) / 2,
          0,
          img.naturalWidth * scale,
          img.naturalHeight * scale,
        );
      })
      .catch(() => {
        // failed to load; leave the canvas blank
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      width={96}
      height={144}
      role="img"
      aria-label={alt}
      className="h-full w-12 shrink-0"
    />
  );
}
