import { Loader2, Trash } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "../ui/button";
import { $deleteObjektList } from "./actions";
import type { MouseEvent } from "react";
import type { ObjektList } from "@/lib/server/db/schema";
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
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";
import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";

type Props = {
  objektList: ObjektList;
};

export default function DeleteList({ objektList }: Props) {
  const target = useProfileContext((ctx) => ctx.target);
  const queryClient = useQueryClient();
  const mutationFn = useServerFn($deleteObjektList);
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(m.toast_list_deleted());

      // remove list from current account query
      queryClient.setQueryData(currentAccountQuery.queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          objektLists: old.objektLists.filter(
            (list) => list.id !== objektList.id,
          ),
        };
      });

      // remove list from target account query if it exists
      if (target?.cosmo?.username) {
        queryClient.setQueryData(
          targetAccountQuery(target.cosmo.username).queryKey,
          (old) => {
            if (!old) return old;
            return {
              ...old,
              objektLists: old.objektLists.filter(
                (list) => list.id !== objektList.id,
              ),
            };
          },
        );
      }
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
        <Button variant="destructive" size="icon" className="rounded-full">
          <Trash />
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
            {mutation.isPending && <Loader2 className="animate-spin" />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
