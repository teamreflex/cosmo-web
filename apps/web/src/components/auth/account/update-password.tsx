import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { m } from "@/i18n/messages";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { updatePasswordSchema } from "@/lib/universal/schema/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

export default function UpdatePassword() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof updatePasswordSchema>) => {
      const result = await authClient.changePassword({
        ...data,
        revokeOtherSessions: true,
      });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: standardSchemaResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  function handleSubmit(data: z.infer<typeof updatePasswordSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(m.auth_password_updated());
        void router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex w-full flex-col gap-2 p-1"
    >
      <Controller
        control={form.control}
        name="currentPassword"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="currentPassword">
              {m.auth_current_password()}
            </FieldLabel>
            <Input
              id="currentPassword"
              type="password"
              placeholder={m.form_password_placeholder()}
              aria-invalid={fieldState.invalid}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="newPassword"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="newPassword">
              {m.auth_new_password()}
            </FieldLabel>
            <Input
              id="newPassword"
              type="password"
              placeholder={m.form_password_placeholder()}
              aria-invalid={fieldState.invalid}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={mutation.isPending || form.formState.isDirty === false}
        >
          {mutation.isPending && (
            <IconLoader2 className="h-4 w-4 animate-spin" />
          )}
          <span>{m.common_update()}</span>
        </Button>
      </div>
    </form>
  );
}
