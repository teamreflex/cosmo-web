import { IconLoader2, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { $removeCollectionFromEvent } from "@/lib/server/events/actions";
import { eventCollectionsQuery, eventsQuery } from "@/lib/queries/events";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";

type Props = {
  eventId: string;
  collectionSlug: string;
};

export default function DeleteCollection({ eventId, collectionSlug }: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: useServerFn($removeCollectionFromEvent),
    onSuccess: () => {
      toast.success(m.admin_collection_removed());
      queryClient.invalidateQueries({ queryKey: eventsQuery().queryKey });
      queryClient.invalidateQueries({
        queryKey: eventCollectionsQuery(eventId).queryKey,
      });
    },
    onError: () => {
      toast.error(m.error_unknown());
    },
  });

  function handleRemove() {
    mutation.mutate({
      data: { eventId, collectionSlug },
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
