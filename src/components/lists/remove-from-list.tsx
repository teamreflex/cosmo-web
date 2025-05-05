"use client";

import type { List } from "@/lib/server/db/schema";
import { ListX, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { removeObjektFromList } from "./actions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "../ui/use-toast";
import { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  id: string;
  collection: Objekt.Collection;
  objektList: List;
};

export default function RemoveFromList({ id, collection, objektList }: Props) {
  const [isPending, startTransition] = useTransition();

  const queryClient = useQueryClient();

  function submit() {
    startTransition(async () => {
      const result = await removeObjektFromList({
        listId: objektList.id,
        entryId: Number(id),
      });
      if (result.status === "success" && result.data) {
        toast({
          description: `Removed ${collection.collectionId} from ${objektList.name}`,
        });
        queryClient.invalidateQueries({
          queryKey: ["objekt-list", objektList.slug],
        });
      }
    });
  }

  return (
    <button
      onClick={submit}
      disabled={isPending}
      className="hover:scale-110 transition-all flex items-center outline-hidden"
      aria-label={`Remove ${collection.collectionId} from ${objektList.name}`}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <ListX className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
