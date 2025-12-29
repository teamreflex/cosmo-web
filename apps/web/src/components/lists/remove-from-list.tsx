import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { IconLoader2, IconPlaylistX } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { $removeObjektFromList } from "./actions";

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
    onSuccess: async () => {
      toast.success(
        m.toast_removed_from_list({
          collectionId: collection.collectionId,
          listName: objektList.name,
        }),
      );
      await queryClient.invalidateQueries({
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
      aria-label={m.list_remove_from_list({
        collectionId: collection.collectionId,
        listName: objektList.name,
      })}
    >
      {mutation.isPending ? (
        <IconLoader2 className="h-3 w-3 animate-spin sm:h-5 sm:w-5" />
      ) : (
        <IconPlaylistX className="h-3 w-3 sm:h-5 sm:w-5" />
      )}
    </button>
  );
}
