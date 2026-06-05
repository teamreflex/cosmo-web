import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { $refreshCollectionMetadata } from "@/lib/functions/metadata";
import { objektMetadataQuery, objektQuery } from "@/lib/queries/objekt-queries";
import { IconLoader2, IconRefresh } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  slug: string;
};

export default function RefreshCollectionMetadata(props: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: $refreshCollectionMetadata,
    onSuccess: async () => {
      toast.success(m.toast_collection_metadata_refreshed());
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: objektQuery(props.slug).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: objektMetadataQuery(props.slug).queryKey,
        }),
      ]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => mutation.mutate({ data: { slug: props.slug } })}
      disabled={mutation.isPending}
      aria-label={m.aria_refresh_collection_metadata()}
    >
      {mutation.isPending ? (
        <IconLoader2 className="size-4 animate-spin" />
      ) : (
        <IconRefresh />
      )}
    </Button>
  );
}
