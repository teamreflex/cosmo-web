import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $deleteObjektList } from "@/lib/functions/lists";
import {
  currentAccountQuery,
  targetAccountQueryFilter,
} from "@/lib/queries/core";
import type { FullAccount } from "@/lib/universal/cosmo-accounts";
import type { ObjektList } from "@apollo/database/web/types";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";

type Props = {
  objektList: ObjektList;
};

export default function DeleteList({ objektList }: Props) {
  const target = useProfileContext((ctx) => ctx.target);
  const removeObjektList = useProfileContext((state) => state.removeObjektList);
  const addObjektList = useProfileContext((state) => state.addObjektList);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: useServerFn($deleteObjektList),
    onMutate: () => {
      toast.success(m.toast_list_deleted());

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

      if (target) {
        removeObjektList(objektList.id);
      }
      // removing by id is a no-op on accounts that don't own the list
      queryClient.setQueriesData<FullAccount>(
        targetAccountQueryFilter,
        (old) =>
          old
            ? {
                ...old,
                objektLists: old.objektLists.filter(
                  (list) => list.id !== objektList.id,
                ),
              }
            : old,
      );
    },
    onError: (error) => {
      toast.error(formatError(error));

      queryClient.setQueryData(currentAccountQuery.queryKey, (old) =>
        old && !old.objektLists.some((list) => list.id === objektList.id)
          ? { ...old, objektLists: [...old.objektLists, objektList] }
          : old,
      );

      if (target) {
        addObjektList(objektList);
      }
      queryClient.setQueriesData<FullAccount>(
        targetAccountQueryFilter,
        (old) =>
          old &&
          old.user?.id === objektList.userId &&
          !old.objektLists.some((list) => list.id === objektList.id)
            ? { ...old, objektLists: [...old.objektLists, objektList] }
            : old,
      );
    },
  });

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    mutation.mutate({
      data: {
        id: objektList.id,
      },
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon-sm"
          aria-label={m.aria_delete_list()}
        >
          <IconTrash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{m.list_delete_confirm()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.list_delete_confirm_description({ listName: objektList.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={handleClick}
            disabled={mutation.isPending}
          >
            <span>{m.common_delete()}</span>
            {mutation.isPending && <IconLoader2 className="animate-spin" />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
