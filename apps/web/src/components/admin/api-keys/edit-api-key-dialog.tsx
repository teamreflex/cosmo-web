import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogFooter } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $updateApiKey } from "@/lib/functions/api-keys";
import { apiKeysQuery } from "@/lib/queries/api-keys";
import type { AdminApiKey } from "@/lib/universal/api-keys";
import {
  type UpdateApiKeyInput,
  updateApiKeySchema,
} from "@/lib/universal/schema/api-keys";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2, IconPencil } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type Props = {
  apiKey: AdminApiKey;
};

export default function EditApiKeyDialog({ apiKey }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: standardSchemaResolver(updateApiKeySchema),
    values: {
      id: apiKey.id,
      name: apiKey.name ?? "",
      enabled: apiKey.enabled,
    },
  });

  const mutation = useMutation({
    mutationFn: $updateApiKey,
    onSuccess: async () => {
      toast.success(m.admin_api_key_updated());
      await queryClient.invalidateQueries({ queryKey: apiKeysQuery.queryKey });
      setOpen(false);
    },
    onError: (error) => {
      toast.error(formatError(error));
    },
  });

  async function handleSubmit(data: UpdateApiKeyInput) {
    await mutation.mutateAsync({ data });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={m.admin_api_key_edit()}
        >
          <IconPencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{m.admin_api_key_edit()}</DialogTitle>
        </DialogHeader>
        {/* oxlint-disable-next-line react/react-compiler */}
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="edit-api-key-name">
                  {m.admin_api_key_name()}
                </FieldLabel>
                <Input id="edit-api-key-name" {...field} />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldLabel htmlFor="edit-api-key-enabled">
                  {m.admin_api_key_enabled()}
                </FieldLabel>
                <Switch
                  id="edit-api-key-enabled"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </Field>
            )}
          />
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {m.common_cancel()}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending}>
              <span>{m.common_save()}</span>
              {mutation.isPending && <IconLoader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
