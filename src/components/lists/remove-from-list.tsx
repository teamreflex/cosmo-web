"use client";

import { IndexedObjekt, ObjektList } from "@/lib/universal/objekt-index";
import { ListX, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { removeObjektFromList } from "./actions";
import { useToast } from "../ui/use-toast";

type Props = {
  objekt: IndexedObjekt;
  list: ObjektList;
  onRemove: (objekt: IndexedObjekt) => void;
};

export default function RemoveFromList({ objekt, list, onRemove }: Props) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await removeObjektFromList({
        listId: list.id,
        objektId: Number(objekt.id),
      });
      if (result.success && result.data) {
        toast({
          description: `Removed ${objekt.collectionId} from ${list.name}`,
        });
        onRemove(objekt);
      }
    });
  }

  return (
    <button
      onClick={submit}
      disabled={isPending}
      className="hover:cursor-pointer hover:scale-110 transition-all flex items-center outline-none"
      aria-label={`Remove ${objekt.collectionId} from ${list.name}`}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <ListX className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
