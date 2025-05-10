import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "../ui/use-toast";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { z } from "zod";
import { passwordSchema } from "./account/common";
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
import { useMemo } from "react";
import { randomHandle } from "./account/update-username";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be less than 20 characters"),
});

type Props = {
  onCancel: () => void;
};

export default function SignUp({ onCancel }: Props) {
  const placeholder = useMemo(() => randomHandle(), []);
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof schema>) => {
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

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  function handleSubmit(data: z.infer<typeof schema>) {
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

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder={placeholder}
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
