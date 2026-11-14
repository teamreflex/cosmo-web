import ConfirmActionDialog from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { $deleteEvent } from "@/lib/functions/events";
import { adminEventsQuery } from "@/lib/queries/events";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  eventId: string;
};

export default function DeleteEvent({ eventId }: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => $deleteEvent({ data: { id: eventId } }),
    onSuccess: async () => {
      toast.success(m.admin_event_deleted());
      await queryClient.invalidateQueries({
        queryKey: adminEventsQuery().queryKey,
      });
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
          size="icon-xs"
          variant="destructive"
          disabled={mutation.isPending}
          aria-label={m.aria_delete_event()}
        >
          <IconTrash className="size-4" />
        </Button>
      }
      size="sm"
      title={m.admin_event_delete_confirm_title()}
      description={m.admin_event_delete_confirm_description()}
      confirmLabel={m.common_delete()}
      variant="destructive"
      mutation={mutation}
    />
  );
}
