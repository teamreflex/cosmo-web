import { cn } from "@/lib/utils";
import { default as NextImage } from "next/image";
import {
  BFFCollectionGroup,
  BFFCollectionGroupObjekt,
} from "@/lib/universal/cosmo/objekts";
import {
  getObjektImageUrls,
  ObjektNewIndicator,
  ObjektSidebar,
} from "./common";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { Info, X } from "lucide-react";
import { useState } from "react";
import MetadataDialog, { fetchObjektQuery } from "./metadata-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useProfileContext } from "@/hooks/use-profile";
import StaticObjekt from "./objekt-static";
import { useObjektSelection } from "@/hooks/use-objekt-selection";
import { useShallow } from "zustand/react/shallow";
import { useObjektOverlay } from "@/store";

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
  const hasSelected = useObjektSelection(
    useShallow((state) =>
      state.hasSelected(group.objekts.map((o) => o.metadata.tokenId))
    )
  );

  const subtitle = group.count === 1 ? "objekt" : "objekts";
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content>
          {/* hide the title and description */}
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>
              {group.collection.collectionId}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description>
              Select an objekt
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>

          {/* content */}
          <div className="fixed left-[50%] translate-x-[-50%] top-12 z-50 flex flex-col w-full max-w-[78rem] max-h-[calc(100dvh-3rem)] overflow-y-auto px-2">
            {/* title */}
            <div className="grid grid-cols-[1fr_auto] grid-rows-2 grid-flow-col">
              <h2 className="text-2xl font-bold">
                {group.collection.collectionId}
              </h2>
              <p className="text-sm font-semibold text-muted-foreground">
                {group.count} {subtitle}
              </p>

              <DialogPrimitive.Close className="place-self-end opacity-70 transition-opacity hover:opacity-100 cursor-pointer disabled:pointer-events-none outline-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                <X className="size-8" />
                <span className="sr-only">Close</span>
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
            "relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent transition-colors ring-2 ring-transparent aspect-photocard",
            hasSelected && "ring-foreground"
          )}
        >
          <NextImage
            onMouseOver={prefetch}
            onLoad={() => setIsLoaded(true)}
            onClick={onClick}
            className={cn(
              "cursor-pointer transition-opacity w-full",
              isLoaded === false && "opacity-0"
            )}
            src={front.display}
            width={291}
            height={450}
            alt={collection.collectionId}
            priority={priority}
            unoptimized
          />

          <ObjektSidebar collection={collection.collectionNo} />
          <RootObjektOverlay
            count={count}
            hasNew={hasNew}
            onClick={() => {
              // populate the query cache so it doesn't re-fetch
              queryClient.setQueryData(
                fetchObjektQuery(collection.slug).queryKey,
                collection
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
          "absolute bottom-0 left-0 isolate p-1 sm:p-2 rounded-tr-lg sm:rounded-tr-xl flex gap-2 group h-5 sm:h-9 w-5 sm:w-9 transition-all",
          "text-(--objekt-text-color) bg-(--objekt-background-color)",
          isHidden && "hidden"
        )}
      >
        <button
          className="z-50 hover:cursor-pointer hover:scale-110 transition-all flex items-center place-self-end"
          onClick={onClick}
        >
          <Info className="h-3 w-3 sm:h-5 sm:w-5" />
        </button>
      </div>

      <div className="absolute top-1 left-1 sm:top-2 sm:left-2 flex flex-row items-center gap-1">
        {count > 1 && (
          <span className="px-2 py-px bg-black text-white rounded-full text-sm font-semibold">
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

  const toRender = objekts.filter((objekt) => {
    return lockedObjekts.includes(objekt.metadata.tokenId) ? showLocked : true;
  });

  return (
    <div
      style={{ "--grid-columns": gridColumns }}
      className="grid grid-cols-3 md:grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))] gap-4 pb-2"
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
