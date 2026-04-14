import { m } from "@/i18n/messages";
import { formatListError } from "@/lib/client/list-errors";
import {
  $addObjektToHaveList,
  $addObjektToList,
  $addObjektToWantList,
} from "@/lib/functions/lists";
import { objektListQueryFilter } from "@/lib/queries/objekt-queries";
import type { ObjektList } from "@apollo/database/web/types";
import { IconLoader2, IconPlaylistAdd, IconPlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { MouseEvent } from "react";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
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
import SaleListDialog from "./sale-list-dialog";

type AddToListProps = {
  collectionId: string;
  collectionSlug: string;
  lists: ObjektList[];
};

export default function AddToList({
  collectionId,
  collectionSlug,
  lists,
}: AddToListProps) {
  const [open, setOpen] = useState(false);
  const [saleListPending, setSaleListPending] = useState<{
    listId: string;
    listName: string;
    currency: string;
  }>();

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            onClick={() => setOpen((state) => !state)}
            className="flex items-center outline-hidden transition-all hover:scale-110"
            aria-label={m.list_select_to_add({ collectionId })}
          >
            <IconPlaylistAdd className="h-3 w-3 sm:h-5 sm:w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-fit">
          <DropdownMenuLabel>{collectionId}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {lists.length === 0 && (
              <DropdownMenuItem className="group truncate text-sm">
                {m.list_zero_lists_available()}
              </DropdownMenuItem>
            )}

            <ScrollArea className="max-h-44 overflow-y-auto">
              {lists.map((list) => (
                <ListItem
                  key={list.id}
                  collectionId={collectionId}
                  collectionSlug={collectionSlug}
                  list={list}
                  onDone={() => setOpen(false)}
                  onSaleListClick={(currency) => {
                    setOpen(false);
                    setSaleListPending({
                      listId: list.id,
                      listName: list.name,
                      currency,
                    });
                  }}
                />
              ))}
            </ScrollArea>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {saleListPending && (
        <SaleListDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setSaleListPending(undefined);
          }}
          objektListId={saleListPending.listId}
          listName={saleListPending.listName}
          collectionSlug={collectionSlug}
          collectionId={collectionId}
          currency={saleListPending.currency}
        />
      )}
    </>
  );
}

type ListItemProps = {
  collectionId: string;
  collectionSlug: string;
  list: ObjektList;
  onDone: () => void;
  onSaleListClick: (currency: string) => void;
};

function ListItem({
  collectionId,
  collectionSlug,
  list,
  onDone,
  onSaleListClick,
}: ListItemProps) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (payload: {
      objektListId: string;
      collectionSlug: string;
      collectionId: string;
    }) => {
      switch (list.type) {
        case "have":
          return await $addObjektToHaveList({ data: payload });
        case "want":
          return await $addObjektToWantList({ data: payload });
        case "regular":
          return await $addObjektToList({
            data: {
              objektListId: payload.objektListId,
              collectionSlug: payload.collectionSlug,
            },
          });
        default:
          list.type satisfies never;
          throw new Error("Invalid list type");
      }
    },
    onSuccess: async () => {
      toast.success(
        m.toast_added_to_list({ collectionId, listName: list.name }),
      );
      await queryClient.invalidateQueries(objektListQueryFilter(list.id));
      onDone();
    },
    onError: (error) => {
      toast.error(formatListError(error, { collectionId }));
    },
  });

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (list.currency) {
      onSaleListClick(list.currency);
      return;
    }
    mutation.mutate({
      objektListId: list.id,
      collectionSlug,
      collectionId,
    });
  }

  return (
    <DropdownMenuItem className="group truncate">
      <button
        type="button"
        onClick={handleClick}
        disabled={mutation.isPending}
        className="flex w-full items-center justify-between gap-2"
        aria-label={m.list_add_to_list_named({ listName: list.name })}
      >
        <div className="flex items-center gap-1.5 text-sm">
          <span>{list.name}</span>
          <span className="text-xs">
            {list.type === "have" && (
              <Badge variant="list-have">{m.list_type_have()}</Badge>
            )}
            {list.type === "want" && (
              <Badge variant="list-want">{m.list_type_want()}</Badge>
            )}
            {list.currency && (
              <Badge variant="secondary">{list.currency}</Badge>
            )}
          </span>
        </div>
        {mutation.isPending ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconPlus className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100" />
        )}
      </button>
    </DropdownMenuItem>
  );
}
