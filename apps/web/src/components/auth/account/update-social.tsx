import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { m } from "@/i18n/messages";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { updateSocialsSchema } from "@/lib/universal/schema/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { IconLoader2 } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

type Props = {
  showSocials: boolean;
  discord?: string;
  twitter?: string;
};

export default function UpdateSocial(props: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateSocialsSchema>) => {
      const result = await authClient.updateUser(data);
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof updateSocialsSchema>>({
    resolver: standardSchemaResolver(updateSocialsSchema),
    defaultValues: {
      showSocials: props.showSocials,
    },
  });

  function handleSubmit(data: z.infer<typeof updateSocialsSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(m.auth_settings_updated());
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
      className="flex w-full flex-col gap-2"
    >
      <Controller
        control={form.control}
        name="showSocials"
        render={({ field }) => (
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>{m.settings_show_socials()}</FieldLabel>
              <FieldDescription>
                {m.settings_show_socials_description()}
              </FieldDescription>
            </FieldContent>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </Field>
        )}
      />

      <Button
        className="ml-auto w-fit"
        type="submit"
        disabled={mutation.isPending}
      >
        <span>{m.common_save()}</span>
        {mutation.isPending && <IconLoader2 className="h-4 w-4 animate-spin" />}
      </Button>
    </form>
  );
}
