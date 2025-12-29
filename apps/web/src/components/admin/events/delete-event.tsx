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
import { adminEventsQuery } from "@/lib/queries/events";
import { $deleteEvent } from "@/lib/server/events/actions";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

type Props = {
  eventId: string;
};

export default function DeleteEvent({ eventId }: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: useServerFn($deleteEvent),
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

  function handleDelete() {
    mutation.mutate({ data: { id: eventId } });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon-xs"
          variant="destructive"
          disabled={mutation.isPending}
        >
          <IconTrash className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.admin_event_delete_confirm_title()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {m.admin_event_delete_confirm_description()}
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
