import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { $confirmSerial } from "@/lib/functions/serials";
import { serialConfirmationsQuery } from "@/lib/queries/serials";
import {
  type ConfirmSerialInput,
  confirmSerialSchema,
} from "@/lib/universal/schema/serials";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

export default function ConfirmSerialCard() {
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: standardSchemaResolver(confirmSerialSchema),
    defaultValues: { tokenId: "" },
  });

  const mutation = useMutation({
    mutationFn: $confirmSerial,
    onSuccess: async () => {
      toast.success(m.admin_serials_saved());
      form.reset();
      await queryClient.invalidateQueries({
        queryKey: serialConfirmationsQuery.queryKey,
      });
    },
    onError: (error) => toast.error(formatError(error)),
  });

  async function handleSubmit(data: ConfirmSerialInput) {
    await mutation.mutateAsync({ data });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.admin_serials_form_title()}</CardTitle>
        <CardDescription>{m.admin_serials_form_description()}</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="contents">
        <CardContent className="flex flex-col gap-3">
          <Controller
            control={form.control}
            name="tokenId"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="serial-token-id">
                  {m.admin_serials_token_id()}
                </FieldLabel>
                <Input
                  id="serial-token-id"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="serial"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="serial-value">
                  {m.admin_serials_serial()}
                </FieldLabel>
                <Input
                  id="serial-value"
                  type="number"
                  min={1}
                  step={1}
                  aria-invalid={fieldState.invalid}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconDeviceFloppy className="size-4" />
            )}
            <span>{m.admin_serials_save()}</span>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
