"use client";

import { IndexedObjekt, ObjektList } from "@/lib/universal/objekt-index";
import { ListPlus, Loader2 } from "lucide-react";
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

type AddToListProps = {
  objekt: IndexedObjekt;
  lists: ObjektList[];
};

export default function AddToList({ objekt, lists }: AddToListProps) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={() => setOpen((state) => !state)}
          className="hover:cursor-pointer hover:scale-110 transition-all flex items-center outline-none"
          aria-label={`Select list to add ${objekt.collectionId} to`}
        >
          <ListPlus className="h-3 w-3 sm:h-5 sm:w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-48">
        <DropdownMenuLabel>{objekt.collectionId}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {lists.map((list) => (
            <ListItem
              key={list.id}
              objekt={objekt}
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
  objekt: IndexedObjekt;
  list: ObjektList;
  onDone: () => void;
};

function ListItem({ objekt, list, onDone }: ListItemProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function submit(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await addObjektToList({
        listId: list.id,
        objektId: Number(objekt.id),
      });
      if (result.success && result.data) {
        toast({
          description: `Added ${objekt.collectionId} to ${list.name}`,
        });
      }
      onDone();
    });
  }

  return (
    <DropdownMenuItem className="text-sm truncate">
      <button
        onClick={submit}
        disabled={isPending}
        className="w-full flex items-center justify-between"
        aria-label="Add objekt to list"
      >
        {list.name}
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      </button>
    </DropdownMenuItem>
  );
}
