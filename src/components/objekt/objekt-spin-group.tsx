import { cn } from "@/lib/utils";
import { default as NextImage } from "next/image";
import {
  BFFCollectionGroup,
  BFFCollectionGroupObjekt,
} from "@/lib/universal/cosmo/objekts";
import { getObjektImageUrls, ObjektSidebar } from "./common";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { Lock, X } from "lucide-react";
import { useState } from "react";
import { useLockedObjekt, useProfileContext } from "@/hooks/use-profile";
import { useShallow } from "zustand/react/shallow";
import { useObjektSpin } from "@/hooks/use-objekt-spin";
import { useFilters } from "@/hooks/use-filters";

interface Props {
  group: BFFCollectionGroup;
  gridColumns: number;
  showLocked: boolean;
  priority?: boolean;
}

/**
 * Shows all objekts in the collection group on click.
 */
export default function SpinGroupedObjekt({
  group,
  gridColumns,
  showLocked,
  priority = false,
}: Props) {
  const isOpen = useObjektSpin(
    useShallow(
      (state) =>
        state.openCollection?.collection.collectionId ===
        group.collection.collectionId
    )
  );
  const setOpen = useObjektSpin((state) => state.setOpenCollection);
  const hasSelected = useObjektSpin(
    useShallow((state) =>
      state.hasSelected(group.objekts.map((o) => o.metadata.tokenId))
    )
  );

  const subtitle = group.count === 1 ? "objekt" : "objekts";
  const collection = Objekt.fromCollectionGroup({
    collection: group.collection,
  });

  function handleOpenChange(open: boolean) {
    if (open) {
      setOpen(group);
    } else {
      setOpen(null);
    }
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <RootObjekt
        collection={collection}
        count={group.count}
        hasSelected={hasSelected}
        onClick={() => setOpen(group)}
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
  onClick: () => void;
  priority?: boolean;
};

function RootObjekt({
  collection,
  count,
  hasSelected,
  onClick,
  priority = false,
}: RootObjektProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const { front } = getObjektImageUrls(collection);

  return (
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
        decoding="async"
        unoptimized
      />

      <ObjektSidebar collection={collection.collectionNo} />
      <div className="absolute top-1 left-1 sm:top-2 sm:left-2 flex flex-row items-center gap-1">
        {count > 1 && (
          <span className="px-2 py-px bg-black text-white rounded-full text-sm font-semibold">
            {count}
          </span>
        )}
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
          <SpinnableObjekt
            key={objekt.tokenId}
            collection={collection}
            token={objekt}
          />
        );
      })}
    </div>
  );
}

type SpinnableObjektProps = {
  collection: Objekt.Collection;
  token: Objekt.Token;
};

/**
 * Used within a collection group list.
 */
function SpinnableObjekt({ collection, token }: SpinnableObjektProps) {
  const { reset } = useFilters();
  const isLocked = useLockedObjekt(token.tokenId);
  const select = useObjektSpin((state) => state.select);
  const isSelected = useObjektSpin(
    useShallow((state) => state.isSelected(token.tokenId))
  );

  const { front } = getObjektImageUrls(collection);

  function handleClick() {
    if (!isLocked) {
      select({ collection, token });
      reset();
    }
  }

  return (
    <div
      style={{
        "--objekt-background-color": collection.backgroundColor,
        "--objekt-text-color": collection.textColor,
      }}
      className={cn(
        "relative overflow-hidden rounded-lg md:rounded-xl lg:rounded-2xl touch-manipulation bg-accent transition-colors aspect-photocard ring-2 ring-transparent cursor-pointer",
        isSelected && "ring-foreground",
        isLocked && "cursor-not-allowed"
      )}
    >
      <NextImage
        role="button"
        onClick={handleClick}
        className="w-full"
        src={front.display}
        width={291}
        height={450}
        alt={collection.collectionId}
        decoding="async"
        unoptimized
      />

      {isLocked && (
        <div
          className={cn(
            "absolute top-0 left-0 p-1 sm:p-2 rounded-br-lg sm:rounded-br-xl items-center group h-5 sm:h-9 transition-all overflow-hidden",
            "text-(--objekt-text-color) bg-(--objekt-background-color)",
            "grid grid-flow-col grid-cols-[1fr_min-content]"
          )}
        >
          <div className="flex items-center gap-2">
            <Lock className="h-3 w-3 sm:h-5 sm:w-5 shrink-0" />
          </div>
        </div>
      )}

      <ObjektSidebar
        collection={collection.collectionNo}
        serial={token.serial}
      />
    </div>
  );
}
