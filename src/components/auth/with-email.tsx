"use client";

import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "../ui/use-toast";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

type Props = {
  onForgotPassword: () => void;
};

export default function WithEmail({ onForgotPassword }: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const result = await authClient.signIn.email({
        email: form.get("email") as string,
        password: form.get("password") as string,
        rememberMe: true,
      });

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const handleSubmit = (form: FormData) => {
    mutation.mutate(form, {
      onSuccess: () => {
        router.refresh();
      },
      onError: (error) => {
        toast({
          title: "Error!",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-2 w-full">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email Address</Label>
        <Input type="email" name="email" id="email" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input type="password" name="password" id="password" />
      </div>

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
  );
}
