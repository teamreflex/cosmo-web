import { IconLoader2, IconPlaylistAdd, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
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
import { $addObjektToList } from "./actions";
import type { ObjektList } from "@/lib/server/db/schema";
import type { MouseEvent } from "react";
import { m } from "@/i18n/messages";

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

  return (
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
              />
            ))}
          </ScrollArea>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ListItemProps = {
  collectionId: string;
  collectionSlug: string;
  list: ObjektList;
  onDone: () => void;
};

function ListItem({
  collectionId,
  collectionSlug,
  list,
  onDone,
}: ListItemProps) {
  const queryClient = useQueryClient();
  const mutationFn = useServerFn($addObjektToList);
  const mutation = useMutation({
    mutationFn,
    onSuccess() {
      toast.success(
        m.toast_added_to_list({ collectionId, listName: list.name }),
      );
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "objekt-list" && query.queryKey[1] === list.id,
      });
      onDone();
    },
  });

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    mutation.mutate({
      data: {
        objektListId: list.id,
        collectionSlug: collectionSlug,
      },
    });
  }

  return (
    <DropdownMenuItem className="group truncate text-sm">
      <button
        type="button"
        onClick={handleClick}
        disabled={mutation.isPending}
        className="flex w-full items-center justify-between"
        aria-label={m.list_add_to_list()}
      >
        <span>{list.name}</span>
        {mutation.isPending ? (
          <IconLoader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconPlus className="h-4 w-4 opacity-0 transition-all group-hover:opacity-100" />
        )}
      </button>
    </DropdownMenuItem>
  );
}
