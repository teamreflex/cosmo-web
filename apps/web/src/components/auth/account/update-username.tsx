import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { useRouter } from "@tanstack/react-router";
import type { z } from "zod";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { updateUsernameSchema } from "@/lib/universal/schema/auth";
import { m } from "@/i18n/messages";

type Props = {
  username: string;
};

export default function UpdateUsername({ username }: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateUsernameSchema>) => {
      const result = await authClient.updateUser(data);
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof updateUsernameSchema>>({
    resolver: standardSchemaResolver(updateUsernameSchema),
    defaultValues: {
      username,
    },
  });

  const placeholder = useMemo(() => `${randomHandle()}...`, []);

  function handleSubmit(data: z.infer<typeof updateUsernameSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(m.auth_username_updated());
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
        name="username"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <InputGroup>
              <InputGroupInput
                placeholder={placeholder}
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
              {m.settings_username_description()}
            </FieldDescription>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </form>
  );
}

const handles = [
  "0ct0ber19",
  "withaseul",
  "kimxxlip",
  "zindoriyam",
  "cher_ryppo",
];
export function randomHandle() {
  return handles[Math.floor(Math.random() * handles.length)];
}
