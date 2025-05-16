import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { useMutation } from "@tanstack/react-query";
import { toast } from "../ui/use-toast";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2, MailCheck } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { forgotPasswordSchema } from "@/lib/universal/schema/auth";

type Props = {
  onCancel: () => void;
};

export default function ForgotPassword({ onCancel }: Props) {
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof forgotPasswordSchema>) => {
      const result = await authClient.forgetPassword({
        email: data.email,
        redirectTo: "/auth/reset-password",
      });
      console.log(result);

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  function handleSubmit(data: z.infer<typeof forgotPasswordSchema>) {
    mutation.mutate(data, {
      onError: (error) => {
        toast({
          title: "Error!",
          description: error.message,
        });
      },
    });
  }

  if (mutation.status === "success") {
    return (
      <div className="flex flex-col gap-2 items-center">
        <MailCheck className="w-10 h-10" />
        <p className="text-sm font-semibold">
          We&apos;ve sent you an email to reset your password.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="w-full flex flex-col gap-2"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="me@example.com"
                  data-1p-ignore
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-2 items-center">
          <Button type="submit" disabled={mutation.isPending}>
            <span>Send Reset Link</span>
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          </Button>

          <Button type="button" variant="secondary" onClick={onCancel}>
            <span>Cancel</span>
          </Button>
        </div>
      </form>
    </Form>
  );
}
