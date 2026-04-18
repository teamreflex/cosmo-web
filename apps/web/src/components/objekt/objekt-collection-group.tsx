import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer-radix";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { useObjektTransfer } from "@/hooks/use-objekt-transfer";
import { m } from "@/i18n/messages";
import { getObjektImageUrls } from "@/lib/client/objekt-util";
import { objektQuery } from "@/lib/queries/objekt-queries";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { useObjektOverlay } from "@/store";
import type { BFFCollectionGroup } from "@apollo/cosmo/types/objekts";
import { IconInfoCircle } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { ObjektNewIndicator, ObjektSidebar } from "./common";
import DetailContent from "./detail/detail-content";
import MetadataDialog from "./metadata-dialog";

interface Props {
  group: BFFCollectionGroup;
  gridColumns: number;
  showLocked: boolean;
  priority?: boolean;
}

export default function GroupedObjekt({
  group,
  showLocked,
  priority = false,
}: Props) {
  const hasSelected = useObjektTransfer(
    useShallow((state) =>
      state.hasSelected(group.objekts.map((o) => o.metadata.tokenId)),
    ),
  );

  const collection = Objekt.fromCollectionGroup({
    collection: group.collection,
  });
  const hasNew = group.objekts.some((o) => {
    const acquiredAt = new Date(o.inventory.acquiredAt);
    return Date.now() - acquiredAt.getTime() < 24 * 60 * 60 * 1000;
  });

  return (
    <MetadataDialog slug={collection.slug}>
      <Detail
        collection={collection}
        group={group}
        showLocked={showLocked}
        hasSelected={hasSelected}
        hasNew={hasNew}
        priority={priority}
      />
    </MetadataDialog>
  );
}

type DetailProps = {
  collection: Objekt.Collection;
  group: BFFCollectionGroup;
  showLocked: boolean;
  hasSelected: boolean;
  hasNew: boolean;
  priority: boolean;
};

function Detail({
  collection,
  group,
  showLocked,
  hasSelected,
  hasNew,
  priority,
}: DetailProps) {
  const isDesktop = useMediaQuery();
  const [open, setOpen] = useState(false);

  const tokens = useMemo(
    () =>
      group.objekts
        .filter((o) => (o.nonTransferableReason ? showLocked : true))
        .map((o) => Objekt.fromCollectionGroup({ objekt: o })),
    [group.objekts, showLocked],
  );

  return (
    <>
      <RootObjekt
        collection={collection}
        count={group.count}
        hasSelected={hasSelected}
        hasNew={hasNew}
        onClick={() => setOpen(true)}
        priority={priority}
      />

      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            showCloseButton={false}
            className="grid max-h-[92dvh] w-[calc(100%-2rem)] grid-rows-[1fr] gap-0 overflow-hidden rounded-md p-0 sm:max-w-[min(1400px,calc(100%-4rem))]"
          >
            <div className="sr-only">
              <DialogTitle>{collection.collectionId}</DialogTitle>
              <DialogDescription>{m.objekt_group_select()}</DialogDescription>
            </div>
            <DetailContent collection={collection} tokens={tokens} />
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="h-[92dvh] gap-0 rounded-t-md p-0">
            <div className="sr-only">
              <DrawerTitle>{collection.collectionId}</DrawerTitle>
              <DrawerDescription>{m.objekt_group_select()}</DrawerDescription>
            </div>
            <DetailContent collection={collection} tokens={tokens} />
          </DrawerContent>
        </Drawer>
      )}
    </>
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

  const { front } = getObjektImageUrls(collection);

  function prefetch() {
    const img = new Image();
    img.src = front.download;
  }

  return (
    <div
      role="button"
      style={{
        "--objekt-background-color": collection.backgroundColor,
        "--objekt-text-color": collection.textColor,
      }}
      className={cn(
        "group/objekt relative aspect-photocard touch-manipulation overflow-hidden rounded-md bg-secondary ring-1 ring-border transition-[transform,box-shadow,ring-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:ring-cosmo",
        hasSelected && "ring-2 ring-foreground hover:ring-foreground",
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
        collection={collection}
        count={count}
        hasNew={hasNew}
      />
    </div>
  );
}

type RootObjektOverlayProps = {
  collection: Objekt.Collection;
  count: number;
  hasNew: boolean;
};

function RootObjektOverlay({
  collection,
  count,
  hasNew,
}: RootObjektOverlayProps) {
  const isHidden = useObjektOverlay((state) => state.isHidden);
  const { open } = useMetadataDialog();
  const queryClient = useQueryClient();

  function handleClick() {
    queryClient.setQueryData(objektQuery(collection.slug).queryKey, collection);
    open();
  }

  return (
    <div className="contents">
      <div
        className={cn(
          "group absolute bottom-0 left-0 isolate flex h-5 w-5 gap-2 rounded-tr-md p-1 transition-all sm:h-9 sm:w-9 sm:p-2",
          "bg-(--objekt-background-color) text-(--objekt-text-color)",
          isHidden && "hidden",
        )}
      >
        <button
          className="z-50 flex items-center place-self-end transition-all hover:scale-110"
          onClick={handleClick}
          aria-label={m.aria_collection_info()}
        >
          <IconInfoCircle className="h-3 w-3 sm:h-5 sm:w-5" />
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
