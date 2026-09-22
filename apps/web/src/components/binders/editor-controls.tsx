import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BinderEditor } from "@/hooks/use-binder-editor";
import { m } from "@/i18n/messages";
import { binderLayoutLabel, binderLayouts } from "@/lib/universal/binders";
import { cn } from "@/lib/utils";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

/**
 * A small dashed chip, as used for the layout and the phone page counter.
 */
const ghostChip =
  "inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 font-mono text-xs text-muted-foreground";

/**
 * "Saving…" while any change is in flight, then "Saved". There's no save
 * button, so this is the only sign that changes landed.
 */
export function EditorStatus({ saving }: { saving: boolean }) {
  return (
    <span
      role="status"
      className={cn(
        "shrink-0 font-mono text-[11px] transition-colors",
        saving ? "text-amber-400" : "text-emerald-400",
      )}
    >
      {saving ? m.common_saving() : m.binder_editor_saved()}
    </span>
  );
}

/**
 * Leaves the editor for the owner's profile.
 */
export function DoneButton({ username }: { username: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link to="/@{$username}" params={{ username }}>
        {m.common_done()}
      </Link>
    </Button>
  );
}

/**
 * The layout as a chip. While the binder is empty it opens a menu to change
 * it; once it holds objekts the layout is fixed.
 */
export function LayoutChip({ editor }: { editor: BinderEditor }) {
  const { binder } = editor;
  const label = binderLayoutLabel(binder.layout);

  if (binder.entries.length > 0) {
    return (
      <span
        className={ghostChip}
        title={m.binder_error_binder_layout_locked()}
        aria-label={`${m.binder_editor_layout()}: ${label}`}
      >
        {label}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${m.binder_editor_layout()}: ${label}`}
        className={cn(
          ghostChip,
          "transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-cosmo-text",
        )}
      >
        {label}
        <IconChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <LayoutOptions editor={editor} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The layout choices as radio items, for the layout chip and the phone menu.
 */
export function LayoutOptions({ editor }: { editor: BinderEditor }) {
  return (
    <>
      <DropdownMenuLabel>{m.binder_editor_layout()}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={editor.binder.layout}
        onValueChange={(value) => {
          const layout = binderLayouts.find((option) => option === value);
          if (layout !== undefined) editor.setLayout(layout);
        }}
      >
        {binderLayouts.map((layout) => (
          <DropdownMenuRadioItem key={layout} value={layout}>
            {binderLayoutLabel(layout)}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  );
}

type PageControlsProps = {
  editor: BinderEditor;
  onRemoveLastPage: () => void;
};

/**
 * Previous and next around the page counter, then add page. Remove page shows
 * on the last page of a binder with more than one.
 */
export function DesktopPageControls({
  editor,
  onRemoveLastPage,
}: PageControlsProps) {
  const { page, binder } = editor;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3.5 p-1 font-mono text-xs text-muted-foreground">
      <RoundButton
        aria-label={m.binder_editor_previous_page()}
        disabled={page === 0}
        onClick={() => editor.goToPage(page - 1)}
      >
        <IconChevronLeft className="size-4" />
      </RoundButton>
      <span className="min-w-24 text-center tabular-nums" aria-live="polite">
        {m.binder_editor_page_of({ page: page + 1, total: binder.pageCount })}
      </span>
      <RoundButton
        aria-label={m.binder_editor_next_page()}
        disabled={page === binder.pageCount - 1}
        onClick={() => editor.goToPage(page + 1)}
      >
        <IconChevronRight className="size-4" />
      </RoundButton>

      <button
        type="button"
        aria-label={m.binder_editor_add_page()}
        title={
          editor.canAddPage
            ? m.binder_editor_add_page()
            : m.binder_error_binder_page_limit_reached()
        }
        disabled={!editor.canAddPage}
        onClick={() => editor.addPage()}
        className={cn(
          ghostChip,
          "transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-cosmo-text disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground",
        )}
      >
        <IconPlus className="size-3" />
        {m.binder_editor_page()}
      </button>

      {binder.pageCount > 1 && page === binder.pageCount - 1 && (
        <button
          type="button"
          onClick={onRemoveLastPage}
          className={cn(
            ghostChip,
            "transition-colors hover:border-destructive/60 hover:text-destructive focus-visible:outline-2 focus-visible:outline-cosmo-text",
          )}
        >
          <IconTrash className="size-3" />
          {m.binder_editor_remove_page()}
        </button>
      )}
    </div>
  );
}

function RoundButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "grid size-8 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-cosmo-text disabled:pointer-events-none disabled:opacity-35",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The desktop editor's three ways in: click then click, drag, and clear.
 */
export function EditorHints() {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
      <span>
        <Key>{m.binder_editor_hint_click()}</Key> {m.binder_editor_hint_fill()}
      </span>
      <span>
        <Key>{m.binder_editor_hint_drag_key()}</Key>{" "}
        {m.binder_editor_hint_drag()}
      </span>
      <span>
        <Key>×</Key> {m.binder_editor_hint_clear()}
      </span>
    </p>
  );
}

function Key({ children }: { children: string }) {
  return (
    <kbd className="rounded border border-border px-1.5 py-px font-mono text-[10px] text-foreground/80">
      {children}
    </kbd>
  );
}

/**
 * The page counter chip in the phone editor's top bar: "3/4".
 */
export function PageChip({ editor }: { editor: BinderEditor }) {
  return (
    <span
      className={cn(ghostChip, "tabular-nums")}
      aria-label={m.binder_editor_page_of({
        page: editor.page + 1,
        total: editor.binder.pageCount,
      })}
    >
      {editor.page + 1}/{editor.binder.pageCount}
    </span>
  );
}
