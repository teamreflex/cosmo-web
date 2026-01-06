import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { m } from "@/i18n/messages";
import { objektMetadataQuery } from "@/lib/queries/objekt-queries";
import { $updateCollectionMetadata } from "@/lib/server/metadata";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconEdit, IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type Props = {
  slug: string;
  defaultValue: string | null | undefined;
};

const schema = z.object({
  description: z.string().max(255).nullable(),
});

export default function EditMetadata(props: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      description: props.defaultValue ?? null,
    },
  });

  const mutation = useMutation({
    mutationFn: $updateCollectionMetadata,
    onSuccess: async () => {
      toast.success(m.toast_metadata_updated());
      await queryClient.invalidateQueries({
        queryKey: objektMetadataQuery(props.slug).queryKey,
      });
      setOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function handleSubmit(data: z.infer<typeof schema>) {
    mutation.mutate({ data: { slug: props.slug, ...data } });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm">
          <IconEdit />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end" side="top">
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-3"
        >
          <Textarea
            {...form.register("description")}
            placeholder={m.objekt_metadata_description()}
            rows={3}
          />
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending && (
              <IconLoader2 className="size-4 animate-spin" />
            )}
            {m.common_save()}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
