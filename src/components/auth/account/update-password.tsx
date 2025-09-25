import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updatePasswordSchema } from "@/lib/universal/schema/auth";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

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

  const form = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: standardSchemaResolver(updatePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  function handleSubmit(data: z.infer<typeof updatePasswordSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success("Your password has been updated.");
        router.invalidate();
      },
      onError: (error) => {
        toast.error(error.message);
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
                <Input type="password" placeholder="********" {...field} />
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
                <Input type="password" placeholder="********" {...field} />
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
