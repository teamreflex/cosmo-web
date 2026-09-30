import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $recacheCollectionImages } from "@/lib/functions/collections";
import { adminCollectionQuery } from "@/lib/queries/collections";
import { cn } from "@/lib/utils";
import { IconPhotoDown } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  id: string;
  slug: string;
};

export default function CollectionRecacheButton({ id, slug }: Props) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $recacheCollectionImages,
    onSuccess: async () => {
      toast.success(m.admin_collection_images_recached());
      await queryClient.invalidateQueries({
        queryKey: adminCollectionQuery(slug).queryKey,
      });
    },
    onError: (error) => toast.error(formatError(error)),
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => mutation.mutate({ data: { id } })}
      disabled={mutation.isPending}
    >
      <IconPhotoDown
        className={cn("size-4", mutation.isPending && "animate-pulse")}
      />
      <span>{m.admin_collection_recache_images()}</span>
    </Button>
  );
}
