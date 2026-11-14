import ConfirmActionDialog from "@/components/confirm-action-dialog";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $deleteObjektList } from "@/lib/functions/lists";
import { currentAccountQuery } from "@/lib/queries/core";
import { listShelfQuery, objektListDetailKey } from "@/lib/queries/lists";
import type { ObjektList } from "@apollo/database/web/types";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "../ui/button";

type Props = {
  objektList: ObjektList;
};

export default function DeleteList({ objektList }: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const shelfKey = listShelfQuery(objektList.userId).queryKey;
  const deleteObjektList = useServerFn($deleteObjektList);
  const mutation = useMutation({
    mutationFn: () => deleteObjektList({ data: { id: objektList.id } }),
    onMutate: () => {
      toast.success(m.toast_list_deleted());

      // marked stale before the server's redirect navigates, so no page loads the deleted list from the cache
      void queryClient.invalidateQueries({ queryKey: objektListDetailKey });

      queryClient.setQueryData(currentAccountQuery.queryKey, (old) =>
        old
          ? {
              ...old,
              objektLists: old.objektLists.filter(
                (list) => list.id !== objektList.id,
              ),
            }
          : old,
      );

      queryClient.setQueryData(shelfKey, (old) =>
        old?.filter((list) => list.id !== objektList.id),
      );
    },
    // going back to the deleted list's page reloads it instead of showing the one the router kept
    onSuccess: () => {
      void router.invalidate();
    },
    onError: (error) => {
      toast.error(formatError(error));

      queryClient.setQueryData(currentAccountQuery.queryKey, (old) =>
        old && !old.objektLists.some((list) => list.id === objektList.id)
          ? { ...old, objektLists: [...old.objektLists, objektList] }
          : old,
      );

      // the shelf's previews weren't kept, so refetch rather than restore
      void queryClient.invalidateQueries({ queryKey: shelfKey });
    },
  });

  return (
    <ConfirmActionDialog
      trigger={
        <Button
          variant="destructive"
          size="icon-sm"
          aria-label={m.aria_delete_list()}
        >
          <IconTrash />
        </Button>
      }
      title={m.list_delete_confirm()}
      description={m.list_delete_confirm_description({
        listName: objektList.name,
      })}
      confirmLabel={m.common_delete()}
      mutation={mutation}
    />
  );
}
