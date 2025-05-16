"use client";

import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "../ui/use-toast";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
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
import { signInSchema } from "@/lib/universal/schema/auth";

type Props = {
  onForgotPassword: () => void;
};

export default function WithEmail({ onForgotPassword }: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof signInSchema>) => {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: true,
      });

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function handleSubmit(data: z.infer<typeof signInSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        router.refresh();
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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
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

        <div className="grid grid-cols-2 gap-2 items-center">
          <Button type="submit" disabled={mutation.isPending}>
            <span>Sign In</span>
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          </Button>

          <Button type="button" variant="secondary" onClick={onForgotPassword}>
            <span>Forgot Password</span>
          </Button>
        </div>
      </form>
    </Form>
  );
}
