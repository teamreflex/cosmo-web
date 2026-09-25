import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
  IconDots,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

/**
 * A small dashed chip, as used for the layout and the narrow page counter.
 */
const ghostChip =
  "inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 font-mono text-xs text-muted-foreground";

const ghostChipButton =
  "transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-cosmo-text";

type HeaderProps = {
  editor: BinderEditor;
  username: string;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveLastPage: () => void;
};

/**
 * The editor's top bar. Narrow screens get a bar flush with the screen edges:
 * Done, the name, the page counter and a menu. Beside the picker it's the
 * binder's colour and name, the layout, edit and delete, and the save status.
 */
export function EditorHeader({
  editor,
  username,
  onEdit,
  onDelete,
  onRemoveLastPage,
}: HeaderProps) {
  const { binder } = editor;

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 lg:hidden">
        <DoneButton username={username} slug={binder.slug} />
        <h1 className="min-w-0 flex-1 truncate text-center font-cosmo text-sm font-black uppercase">
          {binder.name}
        </h1>
        <PageChip editor={editor} />
        <EditorMenu
          editor={editor}
          onEdit={onEdit}
          onDelete={onDelete}
          onRemoveLastPage={onRemoveLastPage}
        />
      </div>

      <div className="hidden min-w-0 flex-wrap items-center gap-x-2.5 gap-y-2 lg:flex">
        <span
          aria-hidden
          style={{ backgroundColor: binder.colour }}
          className="size-3.5 shrink-0 rounded-full ring-1 ring-white/15"
        />
        <h1 className="min-w-0 truncate font-cosmo text-base font-black uppercase">
          {binder.name}
        </h1>
        <LayoutChip editor={editor} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.binder_editor_edit()}
          title={m.binder_editor_edit()}
          onClick={onEdit}
        >
          <IconPencil />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.binder_editor_delete()}
          title={m.binder_editor_delete()}
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
        >
          <IconTrash />
        </Button>
        <span className="flex-1" />
        <EditorStatus saving={editor.saving} />
        <DoneButton username={username} slug={binder.slug} />
      </div>
    </>
  );
}

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
        saving
          ? "text-amber-600 dark:text-amber-400"
          : "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {saving ? m.common_saving() : m.binder_editor_saved()}
    </span>
  );
}

/**
 * Leaves the editor for the owner's profile, with the binder open in the viewer.
 */
function DoneButton({ username, slug }: { username: string; slug: string }) {
  return (
    <Link
      to="/@{$username}"
      params={{ username }}
      search={{ binder: slug }}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      {m.common_done()}
    </Link>
  );
}

/**
 * The layout as a chip. While the binder is empty it opens a menu to change
 * it; once it holds objekts the layout is fixed.
 */
function LayoutChip({ editor }: { editor: BinderEditor }) {
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
        className={cn(ghostChip, ghostChipButton)}
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
 * The layout choices as radio items, for the layout chip and the narrow menu.
 */
function LayoutOptions({ editor }: { editor: BinderEditor }) {
  return (
    <DropdownMenuRadioGroup
      value={editor.binder.layout}
      onValueChange={(value) => {
        const layout = binderLayouts.find((option) => option === value);
        if (layout !== undefined) editor.setLayout(layout);
      }}
    >
      <DropdownMenuLabel>{m.binder_editor_layout()}</DropdownMenuLabel>
      {binderLayouts.map((layout) => (
        <DropdownMenuRadioItem key={layout} value={layout} closeOnClick>
          {binderLayoutLabel(layout)}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}

type EditorMenuProps = {
  editor: BinderEditor;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveLastPage: () => void;
};

/**
 * The narrow header's overflow menu: name and colour, layout while empty,
 * removing the last page, and delete.
 */
function EditorMenu({
  editor,
  onEdit,
  onDelete,
  onRemoveLastPage,
}: EditorMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={m.binder_editor_more()}
          />
        }
      >
        <IconDots />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onEdit}>
          <IconPencil />
          {m.binder_editor_edit()}
        </DropdownMenuItem>
        {editor.binder.entries.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <LayoutOptions editor={editor} />
          </>
        )}
        <DropdownMenuSeparator />
        {editor.binder.pageCount > 1 && (
          <DropdownMenuItem onClick={onRemoveLastPage}>
            <IconTrash />
            {/* it's there from any page, so it says which one goes */}
            {m.binder_editor_remove_page_n({ page: editor.binder.pageCount })}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <IconTrash />
          {m.binder_editor_delete()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * The page counter chip in the narrow header: "3/4".
 */
function PageChip({ editor }: { editor: BinderEditor }) {
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

type PageControlsProps = {
  editor: BinderEditor;
  /** the picker sheet covers the narrow bar */
  sheetOpen: boolean;
  onRemoveLastPage: () => void;
};

/**
 * Previous, next and add page. Narrow screens get a bar stuck to the bottom of
 * the screen. Beside the picker they sit under the page around the page
 * counter, and remove page shows on the last page of a binder with more than
 * one.
 */
export function PageControls({
  editor,
  sheetOpen,
  onRemoveLastPage,
}: PageControlsProps) {
  const { page, binder } = editor;
  const previous = {
    "aria-label": m.binder_editor_previous_page(),
    disabled: page === 0,
    onClick: () => editor.goToPage(page - 1),
  };
  const next = {
    "aria-label": m.binder_editor_next_page(),
    disabled: page === binder.pageCount - 1,
    onClick: () => editor.goToPage(page + 1),
  };

  return (
    <>
      <div
        inert={sheetOpen}
        className="sticky bottom-0 z-10 flex gap-2 border-t border-border bg-background px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),10px)] lg:hidden"
      >
        <Button variant="outline" className="h-9.5 flex-1" {...previous}>
          <IconChevronLeft />
        </Button>
        <Button
          variant="cosmo"
          className="h-9.5 flex-1"
          aria-label={m.binder_editor_add_page()}
          disabled={!editor.canAddPage}
          onClick={() => editor.addPage()}
        >
          <IconPlus />
          {m.binder_editor_page()}
        </Button>
        <Button variant="outline" className="h-9.5 flex-1" {...next}>
          <IconChevronRight />
        </Button>
      </div>

      <div className="hidden flex-wrap items-center justify-center gap-3.5 p-1 font-mono text-xs text-muted-foreground lg:flex">
        <RoundButton {...previous}>
          <IconChevronLeft className="size-4" />
        </RoundButton>
        <span className="min-w-24 text-center tabular-nums" aria-live="polite">
          {m.binder_editor_page_of({ page: page + 1, total: binder.pageCount })}
        </span>
        <RoundButton {...next}>
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
            ghostChipButton,
            "disabled:opacity-40 disabled:hover:border-border disabled:hover:text-muted-foreground",
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
    </>
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
 * The ways in beside the picker: click then click, drag, and clear.
 */
export function EditorHints() {
  return (
    <p className="hidden flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-muted-foreground lg:flex">
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
