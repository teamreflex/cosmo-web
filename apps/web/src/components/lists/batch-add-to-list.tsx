import { useBatchAddToList } from "@/hooks/use-add-to-list";
import {
  isTokenSelection,
  type SelectedObjekt,
  useObjektSelection,
} from "@/hooks/use-objekt-selection";
import { m } from "@/i18n/messages";
import {
  $addObjektsToHaveList,
  $addObjektsToList,
  $addObjektsToWantList,
} from "@/lib/functions/lists";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { IconPlaylistAdd } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
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
import BatchSerialPickerDialog from "./batch-serial-picker-dialog";
import ListItemShell from "./list-item-shell";

type Props = {
  lists: ObjektList[];
};

export default function BatchAddToList({ lists }: Props) {
  const [open, setOpen] = useState(false);
  const [saleListPending, setSaleListPending] = useState<ObjektList>();
  const [pickerPending, setPickerPending] = useState<{
    list: ObjektList;
    mode: "have" | "sale";
  }>();
  const selected = useObjektSelection((state) => state.selected);

  /**
   * index selections carry no owned serial,
   * so have/sale prompt the user to pick which copies they own via the serial picker dialog instead
   */
  const collections = selected.flatMap((s) =>
    s.type === "collection" ? [s.collection] : [],
  );
  const hasCollections = collections.length > 0;

  // want lists track collections you don't own, so they only apply to index
  // (collection) selections, not owned-serial selections on a profile
  const filtered = lists.filter(
    (list) => list.type !== "want" || hasCollections,
  );

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
                    return hasCollections ? (
                      <ListItemShell
                        key={list.id}
                        list={list}
                        isPending={false}
                        onClick={() => {
                          setOpen(false);
                          setPickerPending({ list, mode: "have" });
                        }}
                      />
                    ) : (
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
                          if (hasCollections) {
                            setPickerPending({ list, mode: "sale" });
                          } else {
                            setSaleListPending(list);
                          }
                        }}
                      />
                    );
                  case "want":
                    // only reachable in collection mode (filtered out otherwise)
                    return (
                      <WantItem
                        key={list.id}
                        list={list}
                        collections={collections}
                        onDone={() => setOpen(false)}
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

      {pickerPending && (
        <BatchSerialPickerDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setPickerPending(undefined);
          }}
          list={pickerPending.list}
          mode={pickerPending.mode}
          currency={pickerPending.list.currency ?? undefined}
          collections={collections}
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
    { list, attempted: new Set(slugs).size, onDone },
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
  const eligible = selected
    .filter(isTokenSelection)
    .filter((s) => s.token.transferable);
  const mutate = useBatchAddToList(
    {
      list,
      attempted: eligible.length,
      notTradable: selected.length - eligible.length,
      onDone,
    },
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

type WantItemProps = {
  list: ObjektList;
  collections: Objekt.Collection[];
  onDone: () => void;
};

function WantItem({ list, collections, onDone }: WantItemProps) {
  // want lists stack quantity, so every collection counts as added
  const mutate = useBatchAddToList(
    { list, attempted: collections.length, onDone },
    () =>
      $addObjektsToWantList({
        data: {
          objektListId: list.id,
          objekts: collections.map((c) => ({
            slug: c.slug,
            collectionName: c.collectionId,
          })),
        },
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
