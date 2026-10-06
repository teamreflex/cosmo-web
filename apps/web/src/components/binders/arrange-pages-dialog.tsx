import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BinderEditor } from "@/hooks/use-binder-editor";
import { m } from "@/i18n/messages";
import {
  DRAG_DISTANCE,
  TOUCH_DRAG_DELAY,
  TOUCH_DRAG_TOLERANCE,
} from "@/lib/client/binder-editor";
import { getObjektFrontImageRef } from "@/lib/client/objekt-util";
import { env } from "@/lib/env/client";
import { binderGrid, pocketsByPage } from "@/lib/universal/binders";
import type {
  BinderLayout,
  BinderObjekt,
  BinderPocketEntry,
} from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import { objektImageUrl } from "@apollo/image";
import { slugifyObjekt } from "@apollo/util";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Announcements, Data } from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useRef } from "react";
import { useIntersectionObserver } from "usehooks-ts";

type Props = {
  editor: BinderEditor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Reorder pages on a phone, where the page strip only scrolls: every page in
 * a wrapping grid, each dragged after a short hold or with the keyboard.
 * Every drop saves straight away, like the editor's other changes.
 */
export default function ArrangePagesDialog({
  editor,
  open,
  onOpenChange,
}: Props) {
  const { binder } = editor;
  const gridRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // a drag starts over its own spot, which would talk over "picked up"
  const startingOver = useRef(false);
  const pages = pocketsByPage(binder.entries);
  const ids = editor.pageKeys.map((key) => `arrange-${key}`);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: DRAG_DISTANCE },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: TOUCH_DRAG_DELAY,
        tolerance: TOUCH_DRAG_TOLERANCE,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      startingOver.current = true;
      const page = readPage(active.data.current);
      return page === undefined
        ? undefined
        : m.binder_editor_drag_picked_up_page({ page: page + 1 });
    },
    onDragOver: ({ active, over }) => {
      const starting = startingOver.current;
      startingOver.current = false;
      if (starting && over?.id === active.id) return undefined;
      const page = readPage(over?.data.current);
      return page === undefined
        ? undefined
        : m.binder_editor_drag_over_page({ page: page + 1 });
    },
    onDragEnd: ({ active, over }) => {
      const from = readPage(active.data.current);
      const to = readPage(over?.data.current);
      return from === undefined || to === undefined || from === to
        ? m.binder_editor_drag_cancelled()
        : m.binder_editor_drag_moved_page({ from: from + 1, to: to + 1 });
    },
    onDragCancel: () => m.binder_editor_drag_cancelled(),
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        // Escape in a keyboard drag calls off the drag, not the dialog
        if (
          details.reason === "escape-key" &&
          (dragging.current || details.event.defaultPrevented)
        ) {
          details.cancel();
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        // the popup keeps arrow keys to itself, so let them through to a keyboard drag
        onKeyDown={(event) => {
          if (dragging.current) event.preventBaseUIHandler();
        }}
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{m.binder_editor_arrange_pages()}</DialogTitle>
          <DialogDescription>
            {m.binder_editor_arrange_pages_description()}
          </DialogDescription>
        </DialogHeader>

        <DndContext
          id="binder-arrange-pages"
          sensors={sensors}
          collisionDetection={closestCenter}
          // the grid scrolls inside the dialog
          autoScroll={{ canScroll: (element) => element === gridRef.current }}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable: m.binder_editor_arrange_instructions(),
            },
          }}
          onDragStart={() => {
            dragging.current = true;
          }}
          onDragCancel={() => {
            dragging.current = false;
          }}
          onDragEnd={({ active, over }) => {
            dragging.current = false;
            const from = readPage(active.data.current);
            const to = readPage(over?.data.current);
            if (from !== undefined && to !== undefined) {
              editor.movePage(from, to);
            }
          }}
        >
          <SortableContext items={ids} strategy={rectSortingStrategy}>
            <div
              ref={gridRef}
              className="-mx-2 grid grid-cols-3 content-start gap-3 overflow-y-auto px-2 py-1 sm:grid-cols-4"
            >
              {ids.map((id, page) => (
                <ArrangePage
                  key={id}
                  id={id}
                  page={page}
                  layout={binder.layout}
                  pockets={pages.get(page)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <DialogFooter>
          <DialogClose render={<Button />}>{m.common_done()}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function readPage(data: Data | undefined): number | undefined {
  return data?.page;
}

type ArrangePageProps = {
  id: string;
  page: number;
  layout: BinderLayout;
  pockets: ReadonlyMap<number, BinderPocketEntry> | undefined;
};

/**
 * One page as a small copy of itself with its number under it, lifted while
 * it's dragged. Its images load once it scrolls into view, so a long binder
 * doesn't load every page at once.
 */
function ArrangePage({ id, page, layout, pockets }: ArrangePageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { page } });
  const { ref: viewRef, isIntersecting: seen } = useIntersectionObserver({
    freezeOnceVisible: true,
  });
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      viewRef(node);
    },
    [setNodeRef, viewRef],
  );
  const { columns, pocketsPerPage } = binderGrid(layout);

  return (
    <div
      ref={ref}
      {...attributes}
      {...listeners}
      aria-label={m.binder_viewer_go_to_page({ page: page + 1 })}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        // no text magnifier or image menu on the hold that starts a touch drag
        "relative touch-manipulation rounded-md outline-none select-none [-webkit-touch-callout:none] focus-visible:shadow-[0_0_0_2px_var(--color-foreground)]",
        isDragging && "z-10 shadow-xl",
      )}
    >
      <span
        aria-hidden
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        className="grid gap-0.5 rounded-md border border-border bg-muted/60 p-1"
      >
        {Array.from({ length: pocketsPerPage }, (_, slot) => (
          <ArrangePocket
            key={slot}
            objekt={pockets?.get(slot)?.objekt}
            seen={seen}
          />
        ))}
      </span>
      <span
        aria-hidden
        className="mt-1 block text-center text-xs text-muted-foreground tabular-nums"
      >
        {page + 1}
      </span>
    </div>
  );
}

/**
 * One pocket of a page copy: its objekt's image once the page has scrolled
 * into view, the objekt's colour until then, or an empty sleeve. It's its own
 * container, so the corners scale with it like a photocard's.
 */
function ArrangePocket({
  objekt,
  seen,
}: {
  objekt: BinderObjekt | undefined;
  seen: boolean;
}) {
  if (objekt === undefined || !seen) {
    return (
      <span className="@container">
        <i
          style={
            objekt === undefined
              ? undefined
              : { backgroundColor: objekt.backgroundColor }
          }
          className="block aspect-photocard rounded-photocard bg-foreground/8"
        />
      </span>
    );
  }

  const ref = getObjektFrontImageRef({
    slug: slugifyObjekt(objekt.collectionId),
    frontImageVersion: objekt.frontImageVersion,
  });
  return (
    <span className="@container">
      <img
        src={
          ref === null ? undefined : objektImageUrl(env.VITE_CDN_URL, ref, "xs")
        }
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="block aspect-photocard w-full rounded-photocard object-cover"
      />
    </span>
  );
}
