import { authClient } from "@/lib/client/auth";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "../ui/use-toast";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

type Props = {
  onCancel: () => void;
};

export default function SignUp({ onCancel }: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const result = await authClient.signUp.email({
        email: form.get("email") as string,
        password: form.get("password") as string,
        username: form.get("username") as string,
        name: form.get("username") as string,
      });

      if (result.error) {
        throw new Error(result.error.message);
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
        });
      },
    });
  };

  if (mutation.status === "success") {
    return (
      <div className="flex flex-col gap-2 items-center">
        <CheckCircle className="w-10 h-10" />
        <p className="text-sm font-semibold">
          We've sent you an email to verify your account.
        </p>
        <p className="text-sm font-semibold">Signing in...</p>
      </div>
    );
  }

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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          type="text"
          name="username"
          id="username"
          minLength={3}
          maxLength={20}
        />
      </div>

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
  );
}
