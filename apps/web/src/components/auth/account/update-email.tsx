import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateEmailSchema } from "@/lib/universal/schema/auth";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex w-full flex-col gap-2"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder={m.form_email_placeholder()}
                    {...field}
                  />

                  <Submit isPending={mutation.isPending} />
                </div>
              </FormControl>
              <FormDescription>
                {m.settings_email_change_description()}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function Submit(props: { isPending: boolean }) {
  const field = useFormField();

  return (
    <Button type="submit" disabled={props.isPending || field.isDirty === false}>
      {props.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
    </Button>
  );
}
