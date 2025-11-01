import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { updateUsernameSchema } from "@/lib/universal/schema/auth";
import { m } from "@/i18n/messages";

type Props = {
  username: string;
};

export default function UpdateUsername({ username }: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateUsernameSchema>) => {
      const result = await authClient.updateUser(data);
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof updateUsernameSchema>>({
    resolver: standardSchemaResolver(updateUsernameSchema),
    defaultValues: {
      username,
    },
  });

  const placeholder = useMemo(() => `${randomHandle()}...`, []);

  function handleSubmit(data: z.infer<typeof updateUsernameSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success(m.auth_username_updated());
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
        className="flex w-full flex-col gap-2"
      >
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input placeholder={placeholder} {...field} />
                  <Submit isPending={mutation.isPending} />
                </div>
              </FormControl>
              <FormDescription>
                {m.settings_username_description()}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

function Submit(props: { isPending: boolean }) {
  const field = useFormField();

  return (
    <Button type="submit" disabled={props.isPending || field.isDirty === false}>
      {props.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
    </Button>
  );
}

const handles = [
  "0ct0ber19",
  "withaseul",
  "kimxxlip",
  "zindoriyam",
  "cher_ryppo",
];
export function randomHandle() {
  return handles[Math.floor(Math.random() * handles.length)];
}
