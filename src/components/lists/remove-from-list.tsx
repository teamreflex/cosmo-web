import type { ObjektList } from "@/lib/server/db/schema";
import { ListX, Loader2 } from "lucide-react";
import { removeObjektFromList } from "./actions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { useAction } from "next-safe-action/hooks";

type Props = {
  id: string;
  collection: Objekt.Collection;
  objektList: ObjektList;
};

export default function RemoveFromList({ id, collection, objektList }: Props) {
  const { execute, isPending } = useAction(removeObjektFromList, {
    onSuccess() {
      toast.success(
        `Removed ${collection.collectionId} from ${objektList.name}`
      );
      queryClient.invalidateQueries({
        queryKey: ["objekt-list", objektList.id],
      });
    },
  });

  const queryClient = useQueryClient();

  function submit() {
    execute({
      objektListId: objektList.id,
      objektListEntryId: id,
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
