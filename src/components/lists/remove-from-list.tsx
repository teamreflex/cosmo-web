"use client";

import { IndexedObjekt, ObjektList } from "@/lib/universal/objekts";
import { ListX, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { removeObjektFromList } from "./actions";
import { useToast } from "../ui/use-toast";
import { useQueryClient } from "react-query";

type Props = {
  collection: IndexedObjekt;
  list: ObjektList;
};

export default function RemoveFromList({ collection, list }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const queryClient = useQueryClient();

  function submit() {
    startTransition(async () => {
      const result = await removeObjektFromList({
        listId: list.id,
        collectionId: collection.id,
      });
      if (result.success && result.data) {
        toast({
          description: `Removed ${collection.collectionId} from ${list.name}`,
        });
        queryClient.invalidateQueries({ queryKey: ["objekt-list", list.slug] });
      }
    });
  }

  return (
    <button
      onClick={submit}
      disabled={isPending}
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center outline-none"
      aria-label={`Remove ${collection.collectionId} from ${list.name}`}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <ListX className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
