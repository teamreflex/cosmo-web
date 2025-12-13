import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconLoader2 } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useRouter } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Field, FieldError, FieldLabel } from "../ui/field";
import type { z } from "zod";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { signInSchema } from "@/lib/universal/schema/auth";
import { track } from "@/lib/utils";
import { currentAccountQuery } from "@/lib/queries/core";
import { m } from "@/i18n/messages";

type Props = {
  onForgotPassword: () => void;
  onSuccess: () => void;
};

export default function WithEmail(props: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof signInSchema>) => {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: true,
      });

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }

      return result.data;
    },
  });

  const form = useForm<z.infer<typeof signInSchema>>({
    resolver: standardSchemaResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function handleSubmit(data: z.infer<typeof signInSchema>) {
    mutation.mutate(data, {
      onSuccess: async () => {
        track("sign-in");
        await queryClient.invalidateQueries({
          queryKey: currentAccountQuery.queryKey,
        });
        await router.invalidate();
        await router.navigate({ to: "/" });
        props.onSuccess();
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

      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="password">{m.common_password()}</FieldLabel>
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

      <div className="grid grid-cols-2 items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          <span>{m.auth_sign_in()}</span>
          {mutation.isPending && <IconLoader2 className="h-4 w-4 animate-spin" />}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={props.onForgotPassword}
        >
          <span>{m.auth_forgot_password()}</span>
        </Button>
      </div>
    </form>
  );
}
