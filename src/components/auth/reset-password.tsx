"use client";

import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "../ui/use-toast";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
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
import { resetPasswordSchema } from "@/lib/universal/schema/auth";

type Props = {
  token: string;
};

export default function ResetPassword({ token }: Props) {
  const router = useRouter();
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

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  function handleSubmit(data: z.infer<typeof resetPasswordSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast({
          title: "Success!",
          description: "Password reset successfully, please sign in again.",
        });
        router.push("/");
      },
      onError: (error) => {
        toast({
          title: "Error!",
          description: error.message,
        });
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
                <Input
                  type="password"
                  placeholder="********"
                  data-1p-ignore
                  {...field}
                />
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
