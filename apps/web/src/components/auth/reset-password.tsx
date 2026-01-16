import { m } from "@/i18n/messages";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { resetPasswordSchema } from "@/lib/universal/schema/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "../ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";

type Props = {
  token: string;
};

export default function ResetPassword({ token }: Props) {
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof resetPasswordSchema>) => {
      const result = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  function handleSubmit(data: z.infer<typeof resetPasswordSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(m.auth_password_reset_success());
        void navigate({ to: "/" });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex w-full flex-col gap-2"
    >
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="password">{m.auth_new_password()}</FieldLabel>
            <Input
              id="password"
              type="password"
              placeholder={m.form_password_placeholder()}
              aria-invalid={fieldState.invalid}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Button type="submit" disabled={mutation.isPending}>
        <span>{m.auth_reset_password()}</span>
        {mutation.isPending && <IconLoader2 className="h-4 w-4 animate-spin" />}
      </Button>
    </form>
  );
}
