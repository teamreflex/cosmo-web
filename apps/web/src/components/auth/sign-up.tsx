import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconCircleCheck, IconLoader2 } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMemo } from "react";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { randomHandle } from "./account/update-username";
import type { z } from "zod";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { signUpSchema } from "@/lib/universal/schema/auth";
import { track } from "@/lib/utils";
import { m } from "@/i18n/messages";

type Props = {
  onCancel: () => void;
};

export default function SignUp({ onCancel }: Props) {
  const placeholder = useMemo(() => randomHandle(), []);
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof signUpSchema>) => {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        username: data.username,
        name: data.username,
      });

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: standardSchemaResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  function handleSubmit(data: z.infer<typeof signUpSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        track("sign-up");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  if (mutation.status === "success") {
    return (
      <div className="flex flex-col items-center gap-2">
        <IconCircleCheck className="h-10 w-10" />
        <p className="text-sm font-semibold">
          {m.auth_verification_email_sent()}
        </p>
        <p className="text-sm font-semibold">{m.auth_signing_in()}</p>
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

      <Controller
        control={form.control}
        name="username"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="username">{m.common_username()}</FieldLabel>
            <Input
              id="username"
              type="text"
              placeholder={placeholder}
              aria-invalid={fieldState.invalid}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <div className="grid grid-cols-2 items-center gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          <span>{m.auth_create_account()}</span>
          {mutation.isPending && <IconLoader2 className="h-4 w-4 animate-spin" />}
        </Button>

        <Button type="button" variant="secondary" onClick={onCancel}>
          <span>{m.common_cancel()}</span>
        </Button>
      </div>
    </form>
  );
}
