import ConfirmActionDialog from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { $deleteEra } from "@/lib/functions/events";
import { adminErasQuery } from "@/lib/queries/events";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  eraId: string;
  onSuccess: () => void;
};

export default function DeleteEra({ eraId, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => $deleteEra({ data: { id: eraId } }),
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

  return (
    <ConfirmActionDialog
      trigger={
        <Button
          type="button"
          variant="destructive"
          disabled={mutation.isPending}
          aria-label={m.aria_delete_era()}
        >
          <IconTrash className="size-4" />
        </Button>
      }
      size="sm"
      title={m.admin_era_delete_confirm_title()}
      description={m.admin_era_delete_confirm_description()}
      confirmLabel={m.common_delete()}
      variant="destructive"
      mutation={mutation}
    />
  );
}
