import { useImageLoaded } from "@/hooks/use-image-loaded";
import { useMetadataDialog } from "@/hooks/use-metadata-dialog";
import { useObjektImage } from "@/hooks/use-objekt-image";
import { tokenKey, useObjektSelection } from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { objektQuery } from "@/lib/queries/objekt-queries";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { BFFCollectionGroup } from "@apollo/cosmo/types/objekts";
import { IconInfoCircle } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Suspense, use, useMemo, useState } from "react";
import { browser, flushSync } from "react-dom";
import { useShallow } from "zustand/react/shallow";
import { ObjektCount, ObjektNewIndicator, ObjektSidebar } from "./common";
import DetailContent from "./detail/detail-content";
import DetailDialog from "./detail/detail-dialog";
import {
  CornerOverlay,
  OverlayIcon,
  OverlayIconButton,
} from "./overlay/corner-overlay";

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
  const hasSelected = useObjektSelection(
    useShallow((state) =>
      state.hasSelected(group.objekts.map((o) => tokenKey(o.metadata.tokenId))),
    ),
  );

  const collection = Objekt.fromCollectionGroup({
    collection: group.collection,
  });
  const lastAcquiredAt = Math.max(
    ...group.objekts.map((o) => new Date(o.inventory.acquiredAt).getTime()),
  );

  return (
    <Detail
      collection={collection}
      group={group}
      showLocked={showLocked}
      hasSelected={hasSelected}
      lastAcquiredAt={lastAcquiredAt}
      priority={priority}
    />
  );
}

type DetailProps = {
  collection: Objekt.Collection;
  group: BFFCollectionGroup;
  showLocked: boolean;
  hasSelected: boolean;
  /** when the most recent copy in the group was received, in ms */
  lastAcquiredAt: number;
  priority: boolean;
};

function Detail({
  collection,
  group,
  showLocked,
  hasSelected,
  lastAcquiredAt,
  priority,
}: DetailProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
        lastAcquiredAt={lastAcquiredAt}
        onIntent={() => setMounted(true)}
        onClick={() => {
          // a click with no hover before it still mounts the dialog closed, so its enter transition runs
          flushSync(() => setMounted(true));
          setOpen(true);
        }}
        priority={priority}
      />

      {mounted && (
        <DetailDialog
          title={collection.collectionId}
          description={m.objekt_group_select()}
          open={open}
          onOpenChange={setOpen}
        >
          <DetailContent collection={collection} tokens={tokens} />
        </DetailDialog>
      )}
    </>
  );
}

type RootObjektProps = {
  collection: Objekt.Collection;
  count: number;
  hasSelected: boolean;
  /** when the most recent copy in the group was received, in ms */
  lastAcquiredAt: number;
  /** the pointer reached the card, so the detail dialog should get ready */
  onIntent: () => void;
  onClick: () => void;
  priority?: boolean;
};

function RootObjekt({
  collection,
  count,
  hasSelected,
  lastAcquiredAt,
  onIntent,
  onClick,
  priority = false,
}: RootObjektProps) {
  // a priority image skips the fade, so it paints before hydration
  const { isLoaded, checkDecoded, onLoad } = useImageLoaded(priority);

  const imageProps = useObjektImage(collection);

  function prefetch() {
    // warm the image the detail sheet shows, and mount its dialog
    onIntent();
    const img = new Image();
    img.src = getObjektFrontImageUrl(collection, "grid");
  }

  return (
    <div className="@container">
      <div
        role="button"
        style={{
          "--objekt-background-color": collection.backgroundColor,
          "--objekt-text-color": collection.textColor,
        }}
        className={cn(
          "group/objekt relative aspect-photocard touch-manipulation overflow-hidden rounded-photocard bg-secondary outline outline-transparent transition-[transform,translate,box-shadow,outline-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:outline-(--objekt-background-color)",
          hasSelected &&
            "outline-2 outline-foreground hover:outline-foreground",
        )}
      >
        <img
          ref={checkDecoded}
          onPointerOver={prefetch}
          onLoad={onLoad}
          onClick={onClick}
          className={cn(
            "w-full transition-opacity",
            isLoaded === false && "opacity-0",
          )}
          {...imageProps}
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
          lastAcquiredAt={lastAcquiredAt}
        />
      </div>
    </div>
  );
}

type RootObjektOverlayProps = {
  collection: Objekt.Collection;
  count: number;
  /** when the most recent copy in the group was received, in ms */
  lastAcquiredAt: number;
};

function RootObjektOverlay({
  collection,
  count,
  lastAcquiredAt,
}: RootObjektOverlayProps) {
  const { open } = useMetadataDialog();
  const queryClient = useQueryClient();

  function handleClick() {
    queryClient.setQueryData(objektQuery(collection.slug).queryKey, collection);
    open(collection.slug);
  }

  return (
    <div className="contents">
      <CornerOverlay
        corner="bottom-left"
        variant="panel"
        className="isolate flex h-5 w-5 gap-2 sm:h-9 sm:w-9"
      >
        {/* hit area matches the container padding so the whole chip is clickable */}
        <OverlayIconButton
          className="z-50 place-self-end sm:-m-2 sm:p-2"
          onClick={handleClick}
          aria-label={m.aria_collection_info()}
        >
          <OverlayIcon icon={IconInfoCircle} />
        </OverlayIconButton>
      </CornerOverlay>

      <ObjektCount count={count}>
        <Suspense fallback={null}>
          <GroupNewIndicator lastAcquiredAt={lastAcquiredAt} />
        </Suspense>
      </ObjektCount>
    </div>
  );
}

/**
 * The new badge, shown when a copy in the group was received in the last
 * day. That depends on the current time, which the server's clock can
 * disagree with, so only the browser renders it.
 */
function GroupNewIndicator(props: { lastAcquiredAt: number }) {
  use(browser("Whether a group is new depends on the viewer's clock."));
  // capture mount time once rather than reading Date.now() during render
  const [now] = useState(() => Date.now());

  return (
    now - props.lastAcquiredAt < 24 * 60 * 60 * 1000 && <ObjektNewIndicator />
  );
}
