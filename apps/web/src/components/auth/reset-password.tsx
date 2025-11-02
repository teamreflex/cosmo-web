import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import type { z } from "zod";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { resetPasswordSchema } from "@/lib/universal/schema/auth";
import { m } from "@/i18n/messages";

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
        navigate({ to: "/" });
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
          name="password"
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

        <Button type="submit" disabled={mutation.isPending}>
          <span>{m.auth_reset_password()}</span>
          {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        </Button>
      </form>
    </Form>
  );
}
