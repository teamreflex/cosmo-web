"use client";

import { IndexedObjekt, ObjektList } from "@/lib/universal/objekt-index";
import { ListPlus, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
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

type Props = {
  objekt: IndexedObjekt;
  lists: ObjektList[];
};

export default function AddToList({ objekt, lists }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(list: ObjektList) {
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
      setOpen(false);
    });
  }

  return (
    <DropdownMenu open={open}>
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
            <DropdownMenuItem key={list.id} className="text-sm truncate">
              <button
                onClick={() => submit(list)}
                disabled={isPending}
                className="w-full flex items-center justify-between"
                aria-label="Add objekt to list"
              >
                {list.name}
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
