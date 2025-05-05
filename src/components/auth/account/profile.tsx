import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { authClient } from "@/lib/client/auth";
import { PublicUser } from "@/lib/universal/auth";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  user: PublicUser;
};

export default function Profile({ user }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <UpdateUsername username={user.username ?? ""} />
    </div>
  );
}

function UpdateUsername(props: { username: string }) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (form: FormData) => {
      const result = await authClient.updateUser({
        username: form.get("username") as string,
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

  return (
    <div className="flex flex-col gap-2">
      <form action={handleSubmit} className="flex flex-col gap-2 w-full">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              name="username"
              id="username"
              defaultValue={props.username}
              minLength={3}
              maxLength={20}
              data-1p-ignore
            />
            <Button type="submit" disabled={mutation.isPending}>
              <span>Save</span>
              {mutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
