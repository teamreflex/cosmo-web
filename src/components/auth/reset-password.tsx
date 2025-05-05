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
  token: string;
};

export default function ResetPassword({ token }: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const result = await authClient.resetPassword({
        newPassword: form.get("password") as string,
        token,
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
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-2 w-full">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">New Password</Label>
        <Input type="password" name="password" id="password" />
      </div>

      <Button type="submit" disabled={mutation.isPending}>
        <span>Reset Password</span>
        {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
      </Button>
    </form>
  );
}
