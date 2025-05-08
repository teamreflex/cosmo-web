import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { useMutation } from "@tanstack/react-query";
import { toast } from "../ui/use-toast";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2, MailCheck } from "lucide-react";

type Props = {
  onCancel: () => void;
};

export default function ForgotPassword({ onCancel }: Props) {
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const result = await authClient.forgetPassword({
        email: form.get("email") as string,
        redirectTo: "/auth/reset-password",
      });

      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const handleSubmit = (form: FormData) => {
    mutation.mutate(form, {
      onError: (error) => {
        toast({
          title: "Error!",
          description: error.message,
        });
      },
    });
  };

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
    <form action={handleSubmit} className="flex flex-col gap-2 w-full">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email Address</Label>
        <Input type="email" name="email" id="email" />
      </div>

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
  );
}
