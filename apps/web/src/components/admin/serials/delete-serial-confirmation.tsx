import ConfirmActionDialog from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $deleteSerialConfirmation } from "@/lib/functions/serials";
import { serialConfirmationsQuery } from "@/lib/queries/serials";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  tokenId: string;
};

export default function DeleteSerialConfirmation({ tokenId }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => $deleteSerialConfirmation({ data: { tokenId } }),
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

  return (
    <ConfirmActionDialog
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={mutation.isPending}
          aria-label={m.admin_serials_delete()}
          className="text-destructive hover:text-destructive"
        >
          <IconTrash className="size-4" />
        </Button>
      }
      size="sm"
      title={m.admin_serials_delete_confirm_title()}
      description={m.admin_serials_delete_confirm_description({ tokenId })}
      confirmLabel={m.common_delete()}
      variant="destructive"
      mutation={mutation}
    />
  );
}
