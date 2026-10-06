import type { BinderEditor } from "@/hooks/use-binder-editor";
import { m } from "@/i18n/messages";
import { prefersReducedMotion } from "@/lib/client/binder-leaf";
import { pocketsByPage } from "@/lib/universal/binders";
import type { BinderLayout, BinderPocketEntry } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import { useDndMonitor } from "@dnd-kit/core";
import {
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback } from "react";
import type { RefObject } from "react";
import { PageThumbnail } from "./binder-page";
import type { EditorDragData } from "./editor-dnd";

type Props = {
  editor: BinderEditor;
  stripRef: RefObject<HTMLElement | null>;
  className?: string;
};

/**
 * Every page of the binder as a thumbnail, inside the editor's drag and drop.
 * Clicking one goes to that page, dragging one along the strip moves its
 * page, and a pocket or picker card dropped on one goes into that page.
 */
export default function EditorPageStrip({
  editor,
  stripRef,
  className,
}: Props) {
  const { binder, page } = editor;
  const pages = pocketsByPage(binder.entries);
  const ids = editor.pageKeys.map((key) => `page-${key}`);

  // a drag that scrolled the strip and was called off leaves the page on screen out of view
  useDndMonitor({
    onDragCancel: () => {
      const current = stripRef.current?.querySelector<HTMLElement>(
        '[aria-current="page"]',
      );
      if (current) revealInStrip(current);
    },
  });

  return (
    <nav
      ref={stripRef}
      aria-label={m.binder_viewer_pages()}
      className={cn(
        "relative no-scrollbar flex gap-2 overflow-x-auto p-1",
        className,
      )}
    >
      <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
        {ids.map((id, index) => (
          <StripPage
            key={id}
            id={id}
            page={index}
            layout={binder.layout}
            pockets={pages.get(index)}
            current={index === page}
            onSelect={editor.goToPage}
          />
        ))}
      </SortableContext>
    </nav>
  );
}

/**
 * Scroll a thumbnail into view along the strip, without moving the window.
 */
function revealInStrip(thumbnail: HTMLElement) {
  const strip = thumbnail.parentElement;
  if (strip === null) return;
  const left = thumbnail.offsetLeft - strip.scrollLeft;
  if (left >= 0 && left + thumbnail.offsetWidth <= strip.clientWidth) return;
  strip.scrollTo({
    left:
      left < 0
        ? thumbnail.offsetLeft - 4
        : thumbnail.offsetLeft + thumbnail.offsetWidth - strip.clientWidth + 4,
    behavior: prefersReducedMotion() ? "instant" : "smooth",
  });
}

type StripPageProps = {
  id: string;
  page: number;
  layout: BinderLayout;
  pockets: ReadonlyMap<number, BinderPocketEntry> | undefined;
  current: boolean;
  onSelect: (page: number) => void;
};

/**
 * One page in the strip: a sortable thumbnail, and a drop target for pockets
 * and picker cards, ringed while one is over it.
 */
function StripPage({
  id,
  page,
  layout,
  pockets,
  current,
  onSelect,
}: StripPageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    activeIndex,
  } = useSortable({
    id,
    data: { drag: { kind: "page", page } satisfies EditorDragData, page },
  });

  /**
   * A long binder outgrows the strip, so a thumbnail scrolls itself into view
   * as it becomes the page on screen, including when it's added.
   */
  const ref = useCallback(
    (node: HTMLButtonElement | null) => {
      setNodeRef(node);
      if (current && node !== null) revealInStrip(node);
    },
    [setNodeRef, current],
  );

  return (
    <button
      ref={ref}
      type="button"
      {...attributes}
      {...listeners}
      aria-label={m.binder_viewer_go_to_page({ page: page + 1 })}
      aria-current={current ? "page" : undefined}
      onClick={() => onSelect(page)}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        // no text magnifier or image menu on the hold that starts a touch drag
        "group shrink-0 touch-manipulation rounded-md outline-none select-none [-webkit-touch-callout:none]",
        isDragging && "opacity-40",
      )}
    >
      <PageThumbnail
        layout={layout}
        pockets={pockets}
        current={current}
        // a pocket or card over it, rather than another page making room
        className={cn(
          isOver &&
            activeIndex === -1 &&
            "border-emerald-500 shadow-[0_0_0_2px_var(--color-emerald-500)]",
        )}
      />
    </button>
  );
}
