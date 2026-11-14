import ConfirmActionDialog from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $deleteApiKey } from "@/lib/functions/api-keys";
import { apiKeysQuery } from "@/lib/queries/api-keys";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  id: string;
};

export default function DeleteApiKey({ id }: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => $deleteApiKey({ data: { id } }),
    onSuccess: async () => {
      toast.success(m.admin_api_key_deleted());
      await queryClient.invalidateQueries({ queryKey: apiKeysQuery.queryKey });
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
          aria-label={m.admin_api_key_delete()}
          className="text-destructive hover:text-destructive"
        >
          <IconTrash className="size-4" />
        </Button>
      }
      size="sm"
      title={m.admin_api_key_delete_confirm_title()}
      description={m.admin_api_key_delete_confirm_description()}
      confirmLabel={m.common_delete()}
      variant="destructive"
      mutation={mutation}
    />
  );
}
