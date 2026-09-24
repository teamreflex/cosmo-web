import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer-radix";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { BinderViewerOrigin } from "@/hooks/use-open-binder";
import { m } from "@/i18n/messages";
import {
  fadeIn,
  fadeOut,
  leafMotion,
  placeLeaf,
  playFlight,
  prefersReducedMotion,
  ringFrames,
  runSequence,
  visibleCover,
} from "@/lib/client/binder-leaf";
import { binderQuery } from "@/lib/queries/binders";
import {
  binderGrid,
  binderPreviewFromDetail,
  pocketsByPage,
} from "@/lib/universal/binders";
import type {
  BinderDetail,
  BinderLayout,
  BinderPages,
  BinderPreview,
} from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import type { BinderViewerState } from "@/providers/binder-viewer-provider";
import {
  IconChevronLeft,
  IconChevronRight,
  IconPencil,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link, getRouteApi } from "@tanstack/react-router";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, RefObject } from "react";
import { toast } from "sonner";
import BinderCover from "./binder-cover";
import { BinderPage } from "./binder-page";
import { BinderPinButton } from "./binder-pin-toggle";
import {
  PageRail,
  ShareButton,
  SpreadRings,
  ViewerLeaf,
  ViewerMeta,
  ViewerPage,
} from "./binder-viewer-parts";

const route = getRouteApi("/@{$username}");

type Props = {
  userId: string;
  /** the identifier the profile routes under */
  username: string;
  isOwner: boolean;
  viewer: BinderViewerState;
  /** ask the viewer to close, which plays its closing animation */
  onClose: () => void;
  /** the closing animation has finished, or there was nothing to animate */
  onClosed: () => void;
};

type ViewerProps = {
  cover: BinderPreview;
  /** undefined until the pages load */
  binder: BinderDetail | undefined;
  origin: BinderViewerOrigin | null;
  username: string;
  isOwner: boolean;
  closing: boolean;
  onClosed: () => void;
  onClose: () => void;
};

/**
 * The read-only viewer for one open binder, mounted by `BinderViewerProvider` over every profile tab.
 */
export default function BinderViewer({
  userId,
  username,
  isOwner,
  viewer: { slug, origin, closing },
  onClose,
  onClosed,
}: Props) {
  const isDesktop = useMediaQuery();
  const { data: binder, isError } = useQuery(binderQuery(userId, slug));

  // the clicked cover draws the flight until the pages load, and a shared link waits for them
  const cover =
    origin?.preview ?? (binder ? binderPreviewFromDetail(binder) : undefined);

  const closeMissing = useEffectEvent(() => {
    toast.error(
      isError
        ? m.binder_editor_error_loading()
        : m.binder_error_binder_not_found(),
    );
    onClose();
  });
  useEffect(() => {
    if (binder === null || isError) closeMissing();
  }, [binder, isError]);

  // nothing was drawn yet, so there's nothing to animate away
  const closeUnshown = useEffectEvent(onClosed);
  useEffect(() => {
    if (closing && cover === undefined) closeUnshown();
  }, [closing, cover]);

  if (cover === undefined) return null;

  const props = {
    cover,
    binder: binder ?? undefined,
    origin,
    username,
    isOwner,
    closing,
    onClosed,
    onClose,
  } satisfies ViewerProps;

  return isDesktop ? <DesktopViewer {...props} /> : <PhoneViewer {...props} />;
}

/**
 * Chrome that sits outside the pages: height the desktop dialog reserves for
 * the header, page controls, thumbnail rail and margins.
 */
const DESKTOP_CHROME_PX = 250;
/** a page's padding and border either side of its pockets */
const PAGE_FRAME_PX = 38;
const POCKET_GAP_PX = 10;
const POCKET_RATIO = 8.5 / 5.5;

/**
 * Width that fits a spread, or one page, into the viewport height.
 */
function bookWidth(layout: BinderLayout, across: number) {
  const { columns, rows } = binderGrid(layout);
  const reserved =
    DESKTOP_CHROME_PX + PAGE_FRAME_PX + (rows - 1) * POCKET_GAP_PX;
  const page = `(${columns} * (100dvh - ${reserved}px) / ${rows * POCKET_RATIO} + ${(columns - 1) * POCKET_GAP_PX + PAGE_FRAME_PX}px)`;
  return `min(100vw - 2.5rem, 1100px, ${across} * ${page})`;
}

const leftPageClass =
  "rounded-r-[2px] border-r-0 shadow-[inset_-14px_0_24px_-20px_rgb(0_0_0/0.9)]";
const rightPageClass =
  "rounded-l-[2px] shadow-[inset_14px_0_24px_-20px_rgb(0_0_0/0.9)]";

function DesktopViewer(props: ViewerProps) {
  const { cover, origin, closing, onClose } = props;
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const single = cover.layout === "2x2";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !closing) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay
          ref={overlayRef}
          className="bg-black/60 duration-300 supports-backdrop-filter:backdrop-blur-sm"
        />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            closeRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            // hand focus back to the cover it was opened from
            if (origin?.element.isConnected === true) {
              event.preventDefault();
              origin.element.focus({ preventScroll: true });
            }
          }}
          // a single page can be narrower than the header needs
          style={{
            width: `min(100vw - 2.5rem, max(44rem, ${bookWidth(cover.layout, single ? 1 : 2)}))`,
          }}
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 outline-none"
        >
          <DesktopBook {...props} overlayRef={overlayRef} closeRef={closeRef} />
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

type DesktopBookProps = ViewerProps & {
  overlayRef: RefObject<HTMLDivElement | null>;
  closeRef: RefObject<HTMLButtonElement | null>;
};

/**
 * The desktop viewer's contents: a two-page spread on a ring spine, or one
 * page for 2×2 binders, with page controls and a thumbnail rail. Mounted
 * inside the dialog so its refs are ready when the opening animation starts.
 */
function DesktopBook({
  cover,
  binder,
  origin,
  username,
  isOwner,
  closing,
  onClosed,
  overlayRef,
  closeRef,
}: DesktopBookProps) {
  const single = cover.layout === "2x2";
  const step = single ? 1 : 2;
  const pageCount = binder?.pageCount ?? cover.pageCount;
  const pages =
    binder === undefined ? undefined : pocketsByPage(binder.entries);
  // the first page in view
  const [index, setIndex] = useState(0);
  const shown = [index, index + 1]
    .slice(0, step)
    .filter((page) => page < pageCount);

  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const coverPageRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const sequence = useRef<{ cancel: () => void } | null>(null);
  const opened = useRef(false);

  /**
   * Show the spread from `to`, sliding it in from the side it came from. The
   * slide starts before the new pages render, so they never show unanimated.
   */
  function showSpread(to: number) {
    if (closing || to === index || to < 0 || to >= pageCount) return;
    setIndex(to);
    if (!prefersReducedMotion()) {
      const direction = to > index ? 1 : -1;
      bookRef.current?.animate(
        [
          { opacity: 0, transform: `translateX(${direction * 14}px)` },
          { opacity: 1, transform: "none" },
        ],
        leafMotion.pageTurn,
      );
    }
  }

  function turn(direction: -1 | 1) {
    showSpread(index + direction * step);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") turn(-1);
    else if (event.key === "ArrowRight") turn(1);
  }

  /**
   * Open: the cover flies from where it was clicked onto the right-hand page,
   * then swings open on its spine, its back face landing on the left page.
   * Without a cover on screen to start from, the dialog fades in shut first.
   */
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const book = bookRef.current;
    const page = coverPageRef.current;
    const fly = flyRef.current;
    const leaf = leafRef.current;
    if (!stage || !book || !page || !fly || !leaf) return;
    const left = leftRef.current;
    const from = visibleCover(origin?.cover);
    origin?.cover.style.setProperty("visibility", "hidden");

    sequence.current = runSequence(async ({ play }) => {
      if (prefersReducedMotion()) {
        await play(stage, fadeIn, leafMotion.fade);
        opened.current = true;
        return;
      }

      placeLeaf(fly, page, stage);
      left?.setAttribute("data-hold", "");
      for (const chrome of stage.querySelectorAll("[data-viewer-chrome]")) {
        void play(chrome, fadeIn, {
          ...leafMotion.fade,
          delay: 150,
          fill: "backwards",
        });
      }

      if (from === null) {
        await play(
          stage,
          [{ opacity: 0, transform: "scale(0.97)" }, { opacity: 1 }],
          leafMotion.appear,
        );
      } else {
        book.setAttribute("data-hold", "");
        await playFlight(play, fly, from, "in", leafMotion.flight);
        book.removeAttribute("data-hold");
      }

      for (const rings of book.querySelectorAll("[data-spread-rings]")) {
        void play(rings, ringFrames("open"), leafMotion.swingOpen);
      }
      await play(
        leaf,
        [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }],
        { ...leafMotion.swingOpen, fill: "forwards" },
      );
      left?.removeAttribute("data-hold");
      fly.dataset.leaf = "resting";
      opened.current = true;
    });

    // also stops a close, so a viewer replaced mid-close never reports closed
    return () => {
      sequence.current?.cancel();
      book.removeAttribute("data-hold");
      left?.removeAttribute("data-hold");
      delete fly.dataset.leaf;
      origin?.cover.style.removeProperty("visibility");
    };
  }, [origin]);

  // the latest callback, without restarting the close when it changes
  const finish = useEffectEvent(onClosed);

  /**
   * Close: on the first spread the cover swings shut and flies back into the
   * cover it came from, or fades if that's gone. Anywhere else, or mid-open,
   * the dialog just fades.
   */
  useLayoutEffect(() => {
    if (!closing) return;
    const stage = stageRef.current;
    const book = bookRef.current;
    const page = coverPageRef.current;
    const fly = flyRef.current;
    const leaf = leafRef.current;
    const overlay = overlayRef.current;
    if (!stage || !book || !page || !fly || !leaf) {
      finish();
      return;
    }
    const left = leftRef.current;
    const swing = opened.current && !prefersReducedMotion() && index === 0;
    sequence.current?.cancel();
    stage.style.pointerEvents = "none";

    sequence.current = runSequence(async ({ play }) => {
      const fadeScrim = () => {
        if (overlay) {
          void play(overlay, fadeOut, {
            ...leafMotion.scrim,
            fill: "forwards",
          });
        }
      };

      if (!swing) {
        fadeScrim();
        await play(stage, fadeOut, { ...leafMotion.fade, fill: "forwards" });
        finish();
        return;
      }

      placeLeaf(fly, page, stage);
      left?.setAttribute("data-hold", "");
      for (const rings of book.querySelectorAll("[data-spread-rings]")) {
        void play(rings, ringFrames("shut"), leafMotion.swingShut);
      }
      await play(
        leaf,
        [{ transform: "rotateY(-180deg)" }, { transform: "rotateY(0deg)" }],
        { ...leafMotion.swingShut, fill: "forwards" },
      );

      book.setAttribute("data-hold", "");
      fadeScrim();
      for (const chrome of stage.querySelectorAll("[data-viewer-chrome]")) {
        void play(chrome, fadeOut, { ...leafMotion.fade, fill: "forwards" });
      }
      const to = visibleCover(origin?.cover);
      await (to === null
        ? play(fly, fadeOut, { ...leafMotion.fade, fill: "forwards" })
        : playFlight(play, fly, to, "out", {
            ...leafMotion.flightBack,
            fill: "forwards",
          }));
      finish();
    });
  }, [closing, origin, index, overlayRef]);

  // a layer of its own from the start, so fading it out doesn't first rasterise every page image into a new one
  return (
    <div
      ref={stageRef}
      onKeyDown={handleKeyDown}
      className="relative flex flex-col gap-3 will-change-[opacity]"
    >
      <DesktopHeader
        cover={cover}
        binder={binder}
        username={username}
        isOwner={isOwner}
        closeRef={closeRef}
      />

      <div
        ref={bookRef}
        style={{ width: bookWidth(cover.layout, step) }}
        className={cn(
          "relative mx-auto data-hold:invisible",
          !single && "grid grid-cols-2",
        )}
      >
        {single ? (
          <ViewerPage
            ref={coverPageRef}
            layout={cover.layout}
            page={index}
            pockets={pagePockets(pages, index)}
            priority={index === 0}
            className="bg-background"
          />
        ) : (
          <Spread
            layout={cover.layout}
            index={index}
            pageCount={pageCount}
            pages={pages}
            leftRef={leftRef}
            rightRef={coverPageRef}
          />
        )}
      </div>

      <PageControls
        label={
          shown.length === 2
            ? m.binder_viewer_pages_of({
                first: index + 1,
                last: index + 2,
                total: pageCount,
              })
            : m.binder_editor_page_of({
                page: index + 1,
                total: pageCount,
              })
        }
        canTurnBack={index > 0}
        canTurnOn={index + step < pageCount}
        onTurn={turn}
      />

      {pageCount > step && (
        <div data-viewer-chrome>
          <PageRail
            layout={cover.layout}
            pageCount={pageCount}
            pages={pages ?? new Map()}
            current={shown}
            onSelect={(page) => showSpread(page - (page % step))}
            className="justify-center"
          />
        </div>
      )}

      <ViewerLeaf
        flyRef={flyRef}
        leafRef={leafRef}
        cover={cover}
        back={
          single ? undefined : (
            <ViewerPage
              layout={cover.layout}
              page={0}
              pockets={pagePockets(pages, 0)}
              tabIndex={-1}
              className={cn("h-full bg-background", leftPageClass)}
            />
          )
        }
      />
    </div>
  );
}

/**
 * A page's pockets, empty once the binder has loaded, or undefined while the
 * pages are still loading.
 */
function pagePockets(pages: BinderPages | undefined, page: number) {
  return pages === undefined ? undefined : (pages.get(page) ?? new Map());
}

type DesktopHeaderProps = {
  cover: BinderPreview;
  binder: BinderDetail | undefined;
  username: string;
  isOwner: boolean;
  closeRef: RefObject<HTMLButtonElement | null>;
};

function DesktopHeader({
  cover,
  binder,
  username,
  isOwner,
  closeRef,
}: DesktopHeaderProps) {
  const params = route.useParams();

  return (
    <div data-viewer-chrome className="flex items-center gap-3">
      <BinderCover binder={cover} label={false} className="w-10 shrink-0" />
      <div className="grid min-w-0 gap-1">
        <DialogDescription asChild>
          <ViewerMeta cover={cover} binder={binder} />
        </DialogDescription>
        <DialogTitle className="truncate font-cosmo text-xl leading-tight font-black uppercase">
          {cover.name}
        </DialogTitle>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {isOwner && (
          <BinderPinButton username={params.username} binder={cover} />
        )}
        <ShareButton username={username} slug={cover.slug} />
        {isOwner && <EditLink username={username} slug={cover.slug} />}
        <DialogClose asChild>
          <Button
            ref={closeRef}
            variant="outline"
            size="icon-sm"
            aria-label={m.common_close()}
            className="rounded-full"
          >
            <IconX />
          </Button>
        </DialogClose>
      </div>
    </div>
  );
}

type SpreadProps = {
  layout: BinderLayout;
  /** the left-hand page */
  index: number;
  pageCount: number;
  pages: BinderPages | undefined;
  leftRef: RefObject<HTMLDivElement | null>;
  rightRef: RefObject<HTMLDivElement | null>;
};

/**
 * Two facing pages on a ring spine. Past the last page, the right-hand page
 * is blank paper.
 */
function Spread({
  layout,
  index,
  pageCount,
  pages,
  leftRef,
  rightRef,
}: SpreadProps) {
  return (
    <>
      <ViewerPage
        ref={leftRef}
        layout={layout}
        page={index}
        pockets={pagePockets(pages, index)}
        priority={index === 0}
        className={cn("bg-background data-hold:invisible", leftPageClass)}
      />
      {index + 1 < pageCount ? (
        <ViewerPage
          ref={rightRef}
          layout={layout}
          page={index + 1}
          pockets={pagePockets(pages, index + 1)}
          priority={index === 0}
          className={cn("bg-background", rightPageClass)}
        />
      ) : (
        <BinderPage
          ref={rightRef}
          layout={layout}
          className={cn(
            "bg-background from-foreground/[0.045] to-foreground/[0.03]",
            rightPageClass,
          )}
        />
      )}
      <SpreadRings />
    </>
  );
}

type PageControlsProps = {
  label: string;
  canTurnBack: boolean;
  canTurnOn: boolean;
  onTurn: (direction: -1 | 1) => void;
};

function PageControls({
  label,
  canTurnBack,
  canTurnOn,
  onTurn,
}: PageControlsProps) {
  return (
    <div
      data-viewer-chrome
      className="flex items-center justify-center gap-3.5 font-mono text-xs text-muted-foreground"
    >
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={m.binder_editor_previous_page()}
        disabled={!canTurnBack}
        onClick={() => onTurn(-1)}
        className="rounded-full"
      >
        <IconChevronLeft />
      </Button>
      <span aria-live="polite">{label}</span>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={m.binder_editor_next_page()}
        disabled={!canTurnOn}
        onClick={() => onTurn(1)}
        className="rounded-full"
      >
        <IconChevronRight />
      </Button>
    </div>
  );
}

/**
 * The owner's way into the editor. Arriving there unmounts the viewer without
 * a closing animation, as leaving for any other page does.
 */
function EditLink({
  username,
  slug,
  className,
}: {
  username: string;
  slug: string;
  className?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      asChild
      className={cn(
        "border-cosmo-text/50 bg-cosmo/15 text-cosmo-text hover:bg-cosmo/25 hover:text-cosmo-text dark:border-cosmo-text/50 dark:bg-cosmo/15 dark:hover:bg-cosmo/25",
        className,
      )}
    >
      <Link to="/@{$username}/binder/$slug" params={{ username, slug }}>
        <IconPencil />
        {m.binder_viewer_edit()}
      </Link>
    </Button>
  );
}

/** how long the drawer takes to slide in */
const DRAWER_MS = 500;

function PhoneViewer(props: ViewerProps) {
  const { closing, onClose, onClosed } = props;
  const [dismissed, setDismissed] = useState(false);

  return (
    <Drawer
      open={!dismissed}
      onOpenChange={(open) => {
        if (!open && !closing) onClose();
      }}
    >
      <DrawerContent
        onCloseAutoFocus={(event) => {
          if (props.origin?.element.isConnected === true) {
            event.preventDefault();
            props.origin.element.focus({ preventScroll: true });
          }
        }}
        onExitComplete={onClosed}
        className="h-[92dvh] rounded-t-2xl outline-none"
      >
        <PhoneBook {...props} onDismiss={() => setDismissed(true)} />
      </DrawerContent>
    </Drawer>
  );
}

type PhoneBookProps = ViewerProps & {
  onDismiss: () => void;
};

/**
 * The phone viewer: one page at a time on a scroll-snap track, so swiping
 * turns pages, with dots underneath. The drawer slides up with the cover
 * already in place, then the cover swings open.
 */
function PhoneBook({
  cover,
  binder,
  origin,
  username,
  isOwner,
  closing,
  onDismiss,
}: PhoneBookProps) {
  const pageCount = binder?.pageCount ?? cover.pageCount;
  const pages =
    binder === undefined ? undefined : pocketsByPage(binder.entries);
  const { columns, rows } = binderGrid(cover.layout);
  const [index, setIndex] = useState(0);
  const params = route.useParams();

  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstPageRef = useRef<HTMLDivElement>(null);
  const flyRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<HTMLDivElement>(null);
  const sequence = useRef<{ cancel: () => void } | null>(null);
  const opened = useRef(false);

  function scrollToPage(page: number) {
    const track = trackRef.current;
    if (!track || closing || page < 0 || page >= pageCount) return;
    track.scrollTo({
      left: page * track.clientWidth,
      behavior: prefersReducedMotion() ? "instant" : "smooth",
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      scrollToPage(index + (event.key === "ArrowLeft" ? -1 : 1));
    }
  }

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const page = firstPageRef.current;
    const fly = flyRef.current;
    const leaf = leafRef.current;
    origin?.cover.style.setProperty("visibility", "hidden");
    // also stops a close, so a viewer replaced mid-close never dismisses
    const cleanup = () => {
      sequence.current?.cancel();
      if (fly) delete fly.dataset.leaf;
      origin?.cover.style.removeProperty("visibility");
    };
    if (prefersReducedMotion() || !stage || !page || !fly || !leaf) {
      opened.current = true;
      return cleanup;
    }

    placeLeaf(fly, page, stage);
    sequence.current = runSequence(async ({ play }) => {
      // swing once the drawer has settled
      await play(
        leaf,
        [{ transform: "rotateY(0deg)" }, { transform: "rotateY(-180deg)" }],
        { ...leafMotion.swingOpen, delay: DRAWER_MS - 100 },
      );
      delete fly.dataset.leaf;
      opened.current = true;
    });
    return cleanup;
  }, [origin]);

  // read as the close starts, without restarting it when a swipe moves the track
  const dismiss = useEffectEvent(onDismiss);
  const onFirstPage = useEffectEvent(() => index === 0);

  useLayoutEffect(() => {
    if (!closing) return;
    const stage = stageRef.current;
    const page = firstPageRef.current;
    const fly = flyRef.current;
    const leaf = leafRef.current;
    const swing = opened.current && !prefersReducedMotion() && onFirstPage();
    sequence.current?.cancel();

    sequence.current = runSequence(async ({ play }) => {
      if (swing && stage && page && fly && leaf) {
        placeLeaf(fly, page, stage);
        await play(
          leaf,
          [{ transform: "rotateY(-180deg)" }, { transform: "rotateY(0deg)" }],
          { ...leafMotion.swingShut, fill: "forwards" },
        );
      }
      // the drawer slides away over the cover rather than flying back into it
      origin?.cover.style.removeProperty("visibility");
      dismiss();
    });
  }, [closing, origin]);

  // a page's width follows the height left over, so tall layouts still fit
  const pageMaxWidth = `calc((92dvh - 13rem) * ${(columns * 5.5) / (rows * 8.5)})`;

  return (
    <div
      ref={stageRef}
      onKeyDown={handleKeyDown}
      className="relative flex min-h-0 flex-1 flex-col gap-3 pt-3"
    >
      <div className="flex items-center gap-3 px-3">
        <BinderCover binder={cover} label={false} className="w-8 shrink-0" />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <DrawerDescription asChild>
            <ViewerMeta cover={cover} binder={binder} short />
          </DrawerDescription>
          <DrawerTitle className="line-clamp-2 font-cosmo text-base leading-tight font-black uppercase">
            {cover.name}
          </DrawerTitle>
        </div>
        {isOwner && (
          <EditLink
            username={username}
            slug={cover.slug}
            className="shrink-0"
          />
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <span className="self-end px-4 pb-1 font-mono text-[11px] text-muted-foreground">
          {index + 1} / {pageCount}
        </span>
        <div
          ref={trackRef}
          onScroll={(event) => {
            const track = event.currentTarget;
            setIndex(Math.round(track.scrollLeft / track.clientWidth));
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        >
          {Array.from({ length: pageCount }, (_, page) => (
            <div key={page} className="w-full shrink-0 snap-center px-3">
              <ViewerPage
                ref={page === 0 ? firstPageRef : undefined}
                layout={cover.layout}
                page={page}
                pockets={pagePockets(pages, page)}
                priority={page === 0}
                style={{ maxWidth: pageMaxWidth }}
                className="mx-auto bg-background"
              />
            </div>
          ))}
        </div>

        {pageCount > 1 && (
          <div className="flex justify-center gap-1 pt-3">
            {Array.from({ length: pageCount }, (_, page) => (
              <button
                key={page}
                type="button"
                aria-label={m.binder_viewer_go_to_page({ page: page + 1 })}
                aria-current={page === index ? "page" : undefined}
                onClick={() => scrollToPage(page)}
                className="grid h-4 place-items-center outline-none"
              >
                <span
                  className={cn(
                    "block h-1.5 w-1.5 rounded-full bg-foreground/25 transition-[width,background-color] duration-200",
                    page === index && "w-4 bg-cosmo-text",
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        {isOwner && (
          <BinderPinButton
            username={params.username}
            binder={cover}
            className="h-10"
          />
        )}
        <ShareButton
          username={username}
          slug={cover.slug}
          className="h-10 flex-1"
        />
      </div>

      <ViewerLeaf flyRef={flyRef} leafRef={leafRef} cover={cover} />
    </div>
  );
}
