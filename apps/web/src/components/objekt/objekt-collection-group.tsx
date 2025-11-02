import { Dialog as DialogPrimitive, VisuallyHidden } from "radix-ui";
import { Info, X } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import MetadataDialog from "./metadata-dialog";
import { fetchObjektQuery } from "./metadata/common";
import StaticObjekt from "./objekt-static";
import {
  ObjektNewIndicator,
  ObjektSidebar,
  getObjektImageUrls,
} from "./common";
import type {
  BFFCollectionGroup,
  BFFCollectionGroupObjekt,
} from "@/lib/universal/cosmo/objekts";
import { useObjektTransfer } from "@/hooks/use-objekt-transfer";
import { useProfileContext } from "@/hooks/use-profile";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { useObjektOverlay } from "@/store";
import { m } from "@/i18n/messages";

interface Props {
  group: BFFCollectionGroup;
  gridColumns: number;
  showLocked: boolean;
  priority?: boolean;
}

/**
 * Shows all objekts in the collection group on click.
 */
export default function GroupedObjekt({
  group,
  gridColumns,
  showLocked,
  priority = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const hasSelected = useObjektTransfer(
    useShallow((state) =>
      state.hasSelected(group.objekts.map((o) => o.metadata.tokenId)),
    ),
  );

  const subtitle =
    group.count === 1 ? m.objekt_group_objekt() : m.objekt_group_objekts();
  const collection = Objekt.fromCollectionGroup({
    collection: group.collection,
  });
  const hasNew = group.objekts.some((o) => {
    const acquiredAt = new Date(o.inventory.acquiredAt);
    return Date.now() - acquiredAt.getTime() < 24 * 60 * 60 * 1000;
  });

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <RootObjekt
        collection={collection}
        count={group.count}
        hasSelected={hasSelected}
        hasNew={hasNew}
        onClick={() => setOpen(true)}
        priority={priority}
      />

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content>
          {/* hide the title and description */}
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>
              {group.collection.collectionId}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description>
              {m.objekt_group_select()}
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>

          {/* content */}
          <div className="fixed top-12 left-1/2 z-50 flex max-h-[calc(100dvh-3rem)] w-full max-w-[76rem] -translate-x-1/2 flex-col overflow-y-auto px-4.5 lg:px-2">
            {/* title */}
            <div className="grid grid-flow-col grid-cols-[1fr_auto] grid-rows-2">
              <h2 className="text-2xl font-bold">
                {group.collection.collectionId}
              </h2>
              <p className="text-sm font-semibold text-muted-foreground">
                {group.count} {subtitle}
              </p>

              <DialogPrimitive.Close className="place-self-end opacity-70 transition-opacity outline-none hover:opacity-100 disabled:pointer-events-none data-[state=open]:bg-secondary data-[state=open]:text-muted-foreground">
                <X className="size-8" />
                <span className="sr-only">{m.common_close()}</span>
              </DialogPrimitive.Close>
            </div>

            {/* objekts */}
            <ObjektList
              collection={collection}
              objekts={group.objekts}
              gridColumns={gridColumns}
              showLocked={showLocked}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type RootObjektProps = {
  collection: Objekt.Collection;
  count: number;
  hasSelected: boolean;
  hasNew: boolean;
  onClick: () => void;
  priority?: boolean;
};

function RootObjekt({
  collection,
  count,
  hasSelected,
  hasNew,
  onClick,
  priority = false,
}: RootObjektProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const queryClient = useQueryClient();

  const { front } = getObjektImageUrls(collection);

  function prefetch() {
    const img = new Image();
    img.src = front.download;
  }

  return (
    <MetadataDialog slug={collection.slug}>
      {({ open }) => (
        <div
          role="button"
          style={{
            "--objekt-background-color": collection.backgroundColor,
            "--objekt-text-color": collection.textColor,
          }}
          className={cn(
            "relative aspect-photocard touch-manipulation overflow-hidden rounded-lg bg-secondary ring-2 ring-transparent drop-shadow-sm transition-colors md:rounded-xl lg:rounded-2xl",
            hasSelected && "ring-foreground",
          )}
        >
          <img
            onMouseOver={prefetch}
            onLoad={() => setIsLoaded(true)}
            onClick={onClick}
            className={cn(
              "w-full transition-opacity",
              isLoaded === false && "opacity-0",
            )}
            src={front.display}
            width={291}
            height={450}
            alt={collection.collectionId}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
          />

          <ObjektSidebar collection={collection} />
          <RootObjektOverlay
            count={count}
            hasNew={hasNew}
            onClick={() => {
              // populate the query cache so it doesn't re-fetch
              queryClient.setQueryData(
                fetchObjektQuery(collection.slug).queryKey,
                collection,
              );

              // open the dialog
              open();
            }}
          />
        </div>
      )}
    </MetadataDialog>
  );
}

type RootObjektOverlayProps = {
  count: number;
  hasNew: boolean;
  onClick: () => void;
};

function RootObjektOverlay({ count, hasNew, onClick }: RootObjektOverlayProps) {
  const isHidden = useObjektOverlay((state) => state.isHidden);

  return (
    <div className="contents">
      <div
        className={cn(
          "group absolute bottom-0 left-0 isolate flex h-5 w-5 gap-2 rounded-tr-lg p-1 transition-all sm:h-9 sm:w-9 sm:rounded-tr-xl sm:p-2",
          "bg-(--objekt-background-color) text-(--objekt-text-color)",
          isHidden && "hidden",
        )}
      >
        <button
          className="z-50 flex items-center place-self-end transition-all hover:scale-110"
          onClick={onClick}
        >
          <Info className="h-3 w-3 sm:h-5 sm:w-5" />
        </button>
      </div>

      <div className="absolute top-1 left-1 flex flex-row items-center gap-1 sm:top-2 sm:left-2">
        {count > 1 && (
          <span className="rounded-full bg-black px-2 py-px text-sm font-semibold text-white">
            {count}
          </span>
        )}

        {hasNew && <ObjektNewIndicator />}
      </div>
    </div>
  );
}

type ObjektListProps = {
  collection: Objekt.Collection;
  objekts: BFFCollectionGroupObjekt[];
  gridColumns: number;
  showLocked: boolean;
};

function ObjektList({
  collection,
  objekts,
  gridColumns,
  showLocked,
}: ObjektListProps) {
  const pins = useProfileContext((ctx) => ctx.pins);
  const lockedObjekts = useProfileContext((ctx) => ctx.lockedObjekts);

  const toRender = objekts
    .filter((objekt) => {
      return lockedObjekts.includes(objekt.metadata.tokenId)
        ? showLocked
        : true;
    })
    .sort((a, b) => a.metadata.objektNo - b.metadata.objektNo);

  return (
    <div
      style={{ "--grid-columns": gridColumns }}
      className="grid grid-cols-3 gap-4 pb-2 md:grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))]"
    >
      {toRender.map((o) => {
        const objekt = Objekt.fromCollectionGroup({ objekt: o });
        return (
          <StaticObjekt
            key={objekt.tokenId}
            collection={collection}
            token={objekt}
            isPinned={
              pins.findIndex((p) => parseInt(p.tokenId) === objekt.tokenId) !==
              -1
            }
          />
        );
      })}
    </div>
  );
}
