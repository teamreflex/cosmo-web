import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePasswordSchema } from "@/lib/universal/schema/auth";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { m } from "@/i18n/messages";

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
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{m.auth_current_password()}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={m.form_password_placeholder()} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{m.auth_new_password()}</FormLabel>
              <FormControl>
                <Input type="password" placeholder={m.form_password_placeholder()} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={mutation.isPending || form.formState.isDirty === false}
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>{m.common_update()}</span>
          </Button>
        </div>
      </form>
    </Form>
  );
}
