import {
  OverlayIcon,
  OverlayIconButton,
} from "@/components/objekt/overlay/corner-overlay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAddToBinder } from "@/hooks/use-add-to-binder";
import { m } from "@/i18n/messages";
import { binderMenuQuery } from "@/lib/queries/binders";
import type { BinderMenuItem } from "@/lib/universal/binders";
import { IconLoader2, IconNotebook, IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import CreateBinderDialog from "./create-binder-dialog";

type Props = {
  collectionName: string;
  tokenId: number;
};

/**
 * Drop an owned objekt into the first empty pocket of one of the owner's
 * binders, the same shape as "Add to list". The binders load when the menu
 * opens, so no page load pays for them.
 */
export default function AddToBinder({ collectionName, tokenId }: Props) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const username = useParams({
    strict: false,
    select: (params) => params.username,
  });
  const add = useAddToBinder({
    collectionName,
    tokenId,
    onDone: () => setOpen(false),
  });

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <OverlayIconButton
            onClick={() => setOpen((state) => !state)}
            className="outline-hidden"
            aria-label={m.binder_add_select({ collectionId: collectionName })}
          >
            <OverlayIcon icon={IconNotebook} />
          </OverlayIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-fit">
          <DropdownMenuLabel>{collectionName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <ErrorBoundary
              fallback={
                <DropdownMenuItem disabled>
                  {m.binder_shelf_error()}
                </DropdownMenuItem>
              }
            >
              <Suspense
                fallback={
                  <DropdownMenuItem disabled>
                    <IconLoader2 className="animate-spin" />
                    {m.common_loading()}
                  </DropdownMenuItem>
                }
              >
                <BinderMenuItems
                  tokenId={tokenId}
                  pendingId={add.isPending ? add.variables.id : undefined}
                  onAdd={(binder) => add.mutate(binder)}
                  onCreate={
                    username === undefined
                      ? undefined
                      : () => {
                          setOpen(false);
                          setCreateOpen(true);
                        }
                  }
                />
              </Suspense>
            </ErrorBoundary>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {username !== undefined && (
        <CreateBinderDialog
          username={username}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(binder) => add.mutate(binder)}
        />
      )}
    </>
  );
}

type BinderMenuItemsProps = {
  tokenId: number;
  pendingId: string | undefined;
  onAdd: (binder: BinderMenuItem) => void;
  onCreate: (() => void) | undefined;
};

function BinderMenuItems({
  tokenId,
  pendingId,
  onAdd,
  onCreate,
}: BinderMenuItemsProps) {
  const { data: binders } = useSuspenseQuery(binderMenuQuery(tokenId));

  // with no binders yet, the objekt goes into the one made here
  if (binders.length === 0) {
    return (
      <>
        <DropdownMenuItem disabled>{m.binder_add_none()}</DropdownMenuItem>
        {onCreate !== undefined && (
          <DropdownMenuItem onSelect={onCreate}>
            <IconPlus />
            {m.binder_new()}
          </DropdownMenuItem>
        )}
      </>
    );
  }

  return (
    <ScrollArea className="max-h-44 overflow-y-auto">
      {binders.map((binder) => (
        <BinderItem
          key={binder.id}
          binder={binder}
          isPending={binder.id === pendingId}
          onSelect={() => onAdd(binder)}
        />
      ))}
    </ScrollArea>
  );
}

type BinderItemProps = {
  binder: BinderMenuItem;
  isPending: boolean;
  onSelect: () => void;
};

/**
 * A binder row styled like the add-to-list rows, led by its spine colour.
 * Binders already holding the objekt are disabled.
 */
function BinderItem({ binder, isPending, onSelect }: BinderItemProps) {
  const holding = binder.holding !== null;

  return (
    <DropdownMenuItem
      className="group justify-between truncate"
      disabled={holding}
      aria-label={
        holding ? undefined : m.binder_add_named({ name: binder.name })
      }
      onSelect={(event) => {
        // stays open until the objekt lands, like the list rows
        event.preventDefault();
        if (!isPending) onSelect();
      }}
    >
      <div className="flex items-center gap-1.5 text-sm">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-[2px]"
          style={{ backgroundColor: binder.colour }}
        />
        <span>{binder.name}</span>
      </div>
      {holding ? (
        <span className="text-xs text-muted-foreground">
          {m.binder_add_already_in()}
        </span>
      ) : isPending ? (
        <IconLoader2 className="h-4 w-4 animate-spin" />
      ) : (
        <IconPlus className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-focus:opacity-100" />
      )}
    </DropdownMenuItem>
  );
}
