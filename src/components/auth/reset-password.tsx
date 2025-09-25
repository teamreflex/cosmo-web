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
        toast.success("Password reset successfully, please sign in again.");
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
        className="w-full flex flex-col gap-2"
      >
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={mutation.isPending}>
          <span>Reset Password</span>
          {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        </Button>
      </form>
    </Form>
  );
}
