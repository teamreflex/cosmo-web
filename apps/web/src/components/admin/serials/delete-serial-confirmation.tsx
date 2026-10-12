import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $deleteSerialConfirmation } from "@/lib/functions/serials";
import { serialConfirmationsQuery } from "@/lib/queries/serials";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  tokenId: string;
};

export default function DeleteSerialConfirmation({ tokenId }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: $deleteSerialConfirmation,
    onSuccess: async () => {
      toast.success(m.admin_serials_deleted());
      await queryClient.invalidateQueries({
        queryKey: serialConfirmationsQuery.queryKey,
      });
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  async function handleDelete() {
    await mutation.mutateAsync({ data: { tokenId } });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={mutation.isPending}
            aria-label={m.admin_serials_delete()}
            className="text-destructive hover:text-destructive"
          />
        }
      >
        <IconTrash className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.admin_serials_delete_confirm_title()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.admin_serials_delete_confirm_description({ tokenId })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={mutation.isPending}
          >
            <span>{m.common_delete()}</span>
            {mutation.isPending && <IconLoader2 className="animate-spin" />}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
