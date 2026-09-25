import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $deleteBinder } from "@/lib/functions/binders";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

type DeleteProps = {
  binderId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
};

/**
 * Confirms deleting a binder. The dialog stays open until the delete lands,
 * since the editor leaves for the profile straight after.
 */
export function DeleteBinderDialog({
  binderId,
  name,
  open,
  onOpenChange,
  onDeleted,
}: DeleteProps) {
  const mutation = useMutation({
    mutationFn: () => $deleteBinder({ data: { binderId } }),
    onSuccess: () => {
      toast.success(m.binder_editor_deleted());
      onDeleted();
    },
    onError: (error) => toast.error(formatError(error)),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.binder_editor_delete_confirm()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.binder_editor_delete_description({ name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            onClick={(event) => {
              event.preventBaseUIHandler();
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {m.common_delete()}
            {mutation.isPending && <IconLoader2 className="animate-spin" />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type RemovePageProps = {
  page: number;
  objektCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  /** where focus goes after removing, since the button that opened it may go too */
  focusAfterRemove: () => HTMLElement | null;
};

/**
 * Confirms removing the last page when objekts would come out with it.
 */
export function RemovePageDialog({
  page,
  objektCount,
  open,
  onOpenChange,
  onConfirm,
  focusAfterRemove,
}: RemovePageProps) {
  const removed = useRef(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        finalFocus={() => {
          const target = removed.current ? focusAfterRemove() : true;
          removed.current = false;
          return target;
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.binder_editor_remove_page_confirm({ page })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.binder_editor_remove_page_description({ count: objektCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              removed.current = true;
              onConfirm();
            }}
          >
            {m.binder_editor_remove_page()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
