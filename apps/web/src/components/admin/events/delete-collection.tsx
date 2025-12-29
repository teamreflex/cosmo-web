import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import {
  adminEventCollectionsQuery,
  adminEventsQuery,
} from "@/lib/queries/events";
import { $removeCollectionFromEvent } from "@/lib/server/events/actions";
import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

type Props = {
  eventId: string;
  collectionId: string;
};

export default function DeleteCollection({ eventId, collectionId }: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: useServerFn($removeCollectionFromEvent),
    onSuccess: async () => {
      toast.success(m.admin_collection_removed());
      await queryClient.invalidateQueries({
        queryKey: adminEventsQuery().queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: adminEventCollectionsQuery(eventId).queryKey,
      });
    },
    onError: () => {
      toast.error(m.error_unknown());
    },
  });

  function handleRemove() {
    mutation.mutate({
      data: { eventId, collectionId },
    });
  }

  return (
    <Button
      variant="destructive"
      size="icon-xs"
      onClick={handleRemove}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? (
        <IconLoader2 className="size-4 animate-spin" />
      ) : (
        <IconTrash className="size-4" />
      )}
    </Button>
  );
}
