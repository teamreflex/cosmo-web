import {
  OverlayIcon,
  OverlayIconButton,
} from "@/components/objekt/overlay/corner-overlay";
import { m } from "@/i18n/messages";
import { $removeObjektFromList } from "@/lib/functions/lists";
import { objektListQueryFilter } from "@/lib/queries/objekt-queries";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import type { ObjektList } from "@apollo/database/web/types";
import { IconLoader2, IconPlaylistX } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  id: string;
  collection: Objekt.Collection;
  objektList: ObjektList;
};

export default function RemoveFromList({ id, collection, objektList }: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $removeObjektFromList,
    onSuccess: async () => {
      toast.success(
        m.toast_removed_from_list({
          collectionId: collection.collectionId,
          listName: objektList.name,
        }),
      );
      await queryClient.invalidateQueries(objektListQueryFilter(objektList.id));
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
    <OverlayIconButton
      onClick={handleClick}
      disabled={mutation.isPending}
      className="outline-hidden"
      aria-label={m.list_remove_from_list({
        collectionId: collection.collectionId,
        listName: objektList.name,
      })}
    >
      {mutation.isPending ? (
        <OverlayIcon icon={IconLoader2} className="animate-spin" />
      ) : (
        <OverlayIcon icon={IconPlaylistX} />
      )}
    </OverlayIconButton>
  );
}
