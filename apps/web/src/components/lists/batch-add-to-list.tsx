import { useBatchAddToList } from "@/hooks/use-add-to-list";
import {
  type SelectedObjekt,
  useObjektSelection,
} from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import {
  $addObjektsToHaveList,
  $addObjektsToList,
} from "@/lib/functions/lists";
import type { ObjektList } from "@apollo/database/web/types";
import { IconLoader2, IconPlaylistAdd, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ScrollArea } from "../ui/scroll-area";
import BatchSaleListDialog from "./batch-sale-list-dialog";

type Props = {
  lists: ObjektList[];
};

export default function BatchAddToList({ lists }: Props) {
  const [open, setOpen] = useState(false);
  const [saleListPending, setSaleListPending] = useState<ObjektList>();
  const selected = useObjektSelection((state) => state.selected);

  // want lists increment quantity via a different path and are excluded here
  const filtered = lists.filter((list) => list.type !== "want");

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="cosmo" size="sm">
            <IconPlaylistAdd />
            <span>{m.batch_add_to_list()}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-fit">
          <DropdownMenuLabel>{m.batch_add_to_list()}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {filtered.length === 0 && (
              <DropdownMenuItem className="group truncate text-sm">
                {m.list_zero_lists_available()}
              </DropdownMenuItem>
            )}

            <ScrollArea className="max-h-44 overflow-y-auto">
              {filtered.map((list) => {
                switch (list.type) {
                  case "regular":
                    return (
                      <RegularItem
                        key={list.id}
                        list={list}
                        selected={selected}
                        onDone={() => setOpen(false)}
                      />
                    );
                  case "have":
                    return (
                      <HaveItem
                        key={list.id}
                        list={list}
                        selected={selected}
                        onDone={() => setOpen(false)}
                      />
                    );
                  case "sale":
                    return (
                      <ListItemShell
                        key={list.id}
                        list={list}
                        isPending={false}
                        onClick={() => {
                          setOpen(false);
                          setSaleListPending(list);
                        }}
                      />
                    );
                  default:
                    return null;
                }
              })}
            </ScrollArea>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {saleListPending?.currency && (
        <BatchSaleListDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setSaleListPending(undefined);
          }}
          list={saleListPending}
          currency={saleListPending.currency}
        />
      )}
    </>
  );
}

type ItemProps = {
  list: ObjektList;
  selected: SelectedObjekt[];
  onDone: () => void;
};

function RegularItem({ list, selected, onDone }: ItemProps) {
  const slugs = selected.map((s) => s.collection.slug);
  const mutate = useBatchAddToList(
    { list, requested: new Set(slugs).size, onDone },
    () =>
      $addObjektsToList({
        data: { objektListId: list.id, slugs },
      }),
  );
  return (
    <ListItemShell
      list={list}
      isPending={mutate.isPending}
      onClick={() => mutate.mutate()}
    />
  );
}

function HaveItem({ list, selected, onDone }: ItemProps) {
  // only transferable serials can be tracked on a have list
  const eligible = selected.filter((s) => s.token.transferable);
  const mutate = useBatchAddToList(
    { list, requested: eligible.length, onDone },
    () =>
      $addObjektsToHaveList({
        data: {
          objektListId: list.id,
          objekts: eligible.map((s) => ({
            slug: s.collection.slug,
            collectionId: s.collection.id,
            collectionName: s.collection.collectionId,
            tokenId: String(s.token.tokenId),
          })),
        },
      }),
  );

  function handleClick() {
    if (eligible.length === 0) {
      toast.info(m.batch_none_eligible({ listName: list.name }));
      onDone();
      return;
    }
    mutate.mutate();
  }

  return (
    <ListItemShell
      list={list}
      isPending={mutate.isPending}
      onClick={handleClick}
    />
  );
}

type ListItemShellProps = {
  list: ObjektList;
  isPending: boolean;
  onClick: () => void;
};

function ListItemShell({ list, isPending, onClick }: ListItemShellProps) {
  return (
    <DropdownMenuItem className="group truncate">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          onClick();
        }}
        disabled={isPending}
        className="flex w-full items-center justify-between gap-2"
        aria-label={m.list_add_to_list_named({ listName: list.name })}
      >
        <div className="flex items-center gap-1.5 text-sm">
          <span>{list.name}</span>
          <span className="text-xs">
            {list.type === "have" && (
              <Badge variant="list-have">{m.list_type_have()}</Badge>
            )}
            {list.type === "sale" && list.currency && (
              <Badge variant="secondary">{list.currency}</Badge>
            )}
          </span>
        </div>
        {isPending ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconPlus className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100" />
        )}
      </button>
    </DropdownMenuItem>
  );
}
