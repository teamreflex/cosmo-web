import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "../../ui/form";
import { $updateObjektMetadata } from "../actions";
import type { z } from "zod";
import type { ObjektMetadata } from "@/lib/universal/objekts";
import { metadataObjectSchema } from "@/lib/universal/schema/admin";
import { m } from "@/i18n/messages";

type Props = {
  slug: string;
  metadata: ObjektMetadata;
  onClose: () => void;
};

export default function EditMetadata(props: Props) {
  const queryClient = useQueryClient();
  const mutationFn = useServerFn($updateObjektMetadata);
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collection-metadata", "metadata", props.slug],
      });
      toast.success(m.toast_metadata_updated());
      props.onClose();
    },
    onError: () => {
      toast.error(m.toast_metadata_update_failed());
    },
  });

  const form = useForm<z.infer<typeof metadataObjectSchema>>({
    resolver: standardSchemaResolver(metadataObjectSchema),
    defaultValues: {
      collectionId: props.slug,
      description: props.metadata.metadata?.description ?? "",
    },
  });

  async function handleSubmit(data: z.infer<typeof metadataObjectSchema>) {
    await mutation.mutateAsync({ data });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-2"
      >
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          variant="secondary"
          size="sm"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? m.common_saving() : m.common_save()}
        </Button>
      </form>
    </Form>
  );
}
