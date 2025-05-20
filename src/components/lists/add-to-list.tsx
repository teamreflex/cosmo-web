"use client";

import { ListPlus, Loader2, Plus } from "lucide-react";
import { type MouseEvent, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "../ui/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import type { ObjektList } from "@/lib/server/db/schema";
import { useAction } from "next-safe-action/hooks";

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
          className="hover:scale-110 transition-all flex items-center outline-hidden"
          aria-label={`Select list to add ${collectionId} to`}
        >
          <ListPlus className="h-3 w-3 sm:h-5 sm:w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{collectionId}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {lists.length === 0 && (
            <DropdownMenuItem className="text-sm truncate group">
              0 lists available
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
  const { execute, isPending } = useAction(addObjektToList, {
    onSuccess() {
      toast({
        description: `Added ${collectionId} to ${list.name}`,
      });
      queryClient.removeQueries({ queryKey: ["objekt-list", list.slug] });
      onDone();
    },
  });

  const queryClient = useQueryClient();

  function submit(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    execute({
      objektListId: list.id,
      collectionSlug: collectionSlug,
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
