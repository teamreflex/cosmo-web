import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import type { z } from "zod";
import { updateEmailSchema } from "@/lib/universal/schema/auth";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { m } from "@/i18n/messages";

type Props = {
  email: string;
};

export default function UpdateEmail({ email }: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateEmailSchema>) => {
      const result = await authClient.changeEmail({
        newEmail: data.email,
      });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof updateEmailSchema>>({
    resolver: standardSchemaResolver(updateEmailSchema),
    defaultValues: {
      email,
    },
  });

  function handleSubmit(data: z.infer<typeof updateEmailSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(m.auth_email_verification_sent());
        router.invalidate();
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
        name="email"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <InputGroup>
              <InputGroupInput
                type="email"
                placeholder={m.form_email_placeholder()}
                aria-invalid={fieldState.invalid}
                {...field}
              />
              <InputGroupButton
                type="submit"
                disabled={
                  mutation.isPending || form.formState.isDirty === false
                }
              >
                {mutation.isPending ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconDeviceFloppy className="h-4 w-4" />
                )}
              </InputGroupButton>
            </InputGroup>
            <FieldDescription>
              {m.settings_email_change_description()}
            </FieldDescription>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </form>
  );
}
