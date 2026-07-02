import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $refetchCollectionFromCosmo } from "@/lib/functions/collections";
import type { UpdateCollectionInput } from "@/lib/universal/schema/collections";
import { cn } from "@/lib/utils";
import { IconRefresh } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

type Props = {
  id: string;
  form: UseFormReturn<UpdateCollectionInput>;
};

export default function CollectionRefetchButton({ id, form }: Props) {
  const mutation = useMutation({
    mutationFn: $refetchCollectionFromCosmo,
    onSuccess: (values) => {
      form.setValue("artist", values.artist, { shouldDirty: true });
      form.setValue("member", values.member, { shouldDirty: true });
      form.setValue("season", values.season, { shouldDirty: true });
      form.setValue("collectionNo", values.collectionNo, { shouldDirty: true });
      form.setValue("class", values.class, { shouldDirty: true });
      form.setValue("backgroundColor", values.backgroundColor, {
        shouldDirty: true,
      });
      toast.success(m.admin_collection_refetched());
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
      <IconRefresh
        className={cn("size-4", mutation.isPending && "animate-spin")}
      />
      <span>{m.admin_collection_refetch()}</span>
    </Button>
  );
}
