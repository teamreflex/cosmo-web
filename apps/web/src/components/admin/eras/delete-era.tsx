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
import { adminErasQuery } from "@/lib/queries/events";
import { $deleteEra } from "@/lib/server/events/actions";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  eraId: string;
  onSuccess: () => void;
};

export default function DeleteEra({ eraId, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $deleteEra,
    onSuccess: async () => {
      toast.success(m.admin_era_deleted());
      await queryClient.invalidateQueries({
        queryKey: adminErasQuery().queryKey,
      });
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
