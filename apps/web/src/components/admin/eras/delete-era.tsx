import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { $deleteEra } from "@/lib/server/events/actions";
import { erasQuery } from "@/lib/queries/events";
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

type Props = {
  eraId: string;
  onSuccess: () => void;
};

export default function DeleteEra({ eraId, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: useServerFn($deleteEra),
    onSuccess: () => {
      toast.success(m.admin_era_deleted());
      queryClient.invalidateQueries({ queryKey: erasQuery().queryKey });
      onSuccess();
    },
    onError: () => {
      toast.error(m.error_unknown());
    },
  });

  async function handleDelete() {
    await mutation.mutateAsync({ data: { id: eraId } });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          disabled={mutation.isPending}
        >
          <IconTrash className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.admin_era_delete_confirm_title()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.admin_era_delete_confirm_description()}
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
