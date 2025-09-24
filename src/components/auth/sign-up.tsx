import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { randomHandle } from "./account/update-username";
import type { z } from "zod";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { signUpSchema } from "@/lib/universal/schema/auth";
import { track } from "@/lib/utils";

type Props = {
  onCancel: () => void;
};

export default function SignUp({ onCancel }: Props) {
  const placeholder = useMemo(() => randomHandle(), []);
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof signUpSchema>) => {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        username: data.username,
        name: data.username,
      });

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: standardSchemaResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  function handleSubmit(data: z.infer<typeof signUpSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        track("sign-up");
        router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });
  }

  if (mutation.status === "success") {
    return (
      <div className="flex flex-col gap-2 items-center">
        <CheckCircle className="w-10 h-10" />
        <p className="text-sm font-semibold">
          We&apos;ve sent you an email to verify your account.
        </p>
        <p className="text-sm font-semibold">Signing in...</p>
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
                <Input type="email" placeholder="me@example.com" {...field} />
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
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input type="text" placeholder={placeholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-2 items-center">
          <Button type="submit" disabled={mutation.isPending}>
            <span>Create Account</span>
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
