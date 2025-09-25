import { ListX, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { removeObjektFromList } from "./actions";
import type { ObjektList } from "@/lib/server/db/schema";
import type { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  id: string;
  collection: Objekt.Collection;
  objektList: ObjektList;
};

export default function RemoveFromList({ id, collection, objektList }: Props) {
  const queryClient = useQueryClient();
  const mutationFn = useServerFn(removeObjektFromList);
  const mutation = useMutation({
    mutationFn,
    onSuccess() {
      toast.success(
        `Removed ${collection.collectionId} from ${objektList.name}`
      );
      queryClient.invalidateQueries({
        queryKey: ["objekt-list", objektList.id],
      });
    },
  });

  function handleClick() {
    mutation.mutate({
      data: {
        objektListId: objektList.id,
        objektListEntryId: id,
      },
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={mutation.isPending}
      className="hover:scale-110 transition-all flex items-center outline-hidden"
      aria-label={`Remove ${collection.collectionId} from ${objektList.name}`}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3 w-3 sm:h-5 sm:w-5 animate-spin" />
      ) : (
        <ListX className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
