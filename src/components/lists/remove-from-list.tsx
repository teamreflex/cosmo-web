import { ListX, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { $removeObjektFromList } from "./actions";
import type { ObjektList } from "@/lib/server/db/schema";
import type { Objekt } from "@/lib/universal/objekt-conversion";

type Props = {
  id: string;
  collection: Objekt.Collection;
  objektList: ObjektList;
};

export default function RemoveFromList({ id, collection, objektList }: Props) {
  const queryClient = useQueryClient();
  const mutationFn = useServerFn($removeObjektFromList);
  const mutation = useMutation({
    mutationFn,
    onSuccess() {
      toast.success(
        `Removed ${collection.collectionId} from ${objektList.name}`,
      );
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "objekt-list" &&
          query.queryKey[1] === objektList.id,
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
      className="flex items-center outline-hidden transition-all hover:scale-110"
      aria-label={`Remove ${collection.collectionId} from ${objektList.name}`}
    >
      {mutation.isPending ? (
        <Loader2 className="h-3 w-3 animate-spin sm:h-5 sm:w-5" />
      ) : (
        <ListX className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
