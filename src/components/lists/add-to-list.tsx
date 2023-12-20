"use client";

import { IndexedObjekt, ObjektList } from "@/lib/universal/objekts";
import { ListPlus, Loader2, Plus } from "lucide-react";
import { MouseEvent, useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { addObjektToList } from "./actions";
import { useToast } from "../ui/use-toast";
import { useQueryClient } from '@tanstack/react-query';

type AddToListProps = {
  collection: IndexedObjekt;
  lists: ObjektList[];
};

export default function AddToList({ collection, lists }: AddToListProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={() => setOpen((state) => !state)}
          className="hover:cursor-pointer hover:scale-110 transition-all flex items-center outline-none"
          aria-label={`Select list to add ${collection.collectionId} to`}
        >
          <ListPlus className="h-3 w-3 sm:h-5 sm:w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-48">
        <DropdownMenuLabel>{collection.collectionId}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {lists.map((list) => (
            <ListItem
              key={list.id}
              collection={collection}
              list={list}
              onDone={() => setOpen(false)}
            />
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ListItemProps = {
  collection: IndexedObjekt;
  list: ObjektList;
  onDone: () => void;
};

function ListItem({ collection, list, onDone }: ListItemProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const queryClient = useQueryClient();

  function submit(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await addObjektToList({
        listId: list.id,
        collectionId: collection.id,
      });
      if (result.success && result.data) {
        toast({
          description: `Added ${collection.collectionId} to ${list.name}`,
        });
        queryClient.removeQueries({ queryKey: ["objekt-list", list.slug] });
      }
      onDone();
    });
  }

  return (
    <DropdownMenuItem className="text-sm truncate group">
      <button
        onClick={submit}
        disabled={isPending}
        className="w-full flex items-center justify-between"
        aria-label="Add objekt to list"
      >
        {list.name}
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all" />
        )}
      </button>
    </DropdownMenuItem>
  );
}
