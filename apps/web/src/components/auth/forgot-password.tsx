import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconLoader2, IconMailCheck } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Field, FieldError, FieldLabel } from "../ui/field";
import type { z } from "zod";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { forgotPasswordSchema } from "@/lib/universal/schema/auth";
import { m } from "@/i18n/messages";

type Props = {
  onCancel: () => void;
};

export default function ForgotPassword({ onCancel }: Props) {
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof forgotPasswordSchema>) => {
      const result = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/auth/reset-password",
      });

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  function handleSubmit(data: z.infer<typeof forgotPasswordSchema>) {
    mutation.mutate(data, {
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  if (mutation.status === "success") {
    return (
      <div className="flex flex-col items-center gap-2">
        <IconMailCheck className="h-10 w-10" />
        <p className="text-sm font-semibold">
          {m.auth_password_reset_email_sent()}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex w-full flex-col gap-2"
    >
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="email">{m.form_email()}</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder={m.form_email_placeholder()}
              aria-invalid={fieldState.invalid}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <div className="grid grid-cols-2 items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          <span>{m.auth_send_reset_link()}</span>
          {mutation.isPending && <IconLoader2 className="h-4 w-4 animate-spin" />}
        </Button>

        <Button type="button" variant="secondary" onClick={onCancel}>
          <span>{m.common_cancel()}</span>
        </Button>
      </div>
    </form>
  );
}
