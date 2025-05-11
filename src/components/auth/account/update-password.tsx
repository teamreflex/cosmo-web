import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "@/components/ui/use-toast";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updatePasswordSchema } from "@/lib/universal/schema/auth";

export default function UpdatePassword() {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof updatePasswordSchema>) => {
      const result = await authClient.changePassword({
        ...data,
        revokeOtherSessions: true,
      });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  function handleSubmit(data: z.infer<typeof updatePasswordSchema>) {
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
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Password</FormLabel>
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
          name="newPassword"
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

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={mutation.isPending || form.formState.isDirty === false}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Update</span>
          </Button>
        </div>
      </form>
    </Form>
  );
}
