import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  useFormField,
} from "@/components/ui/form";
import { toast } from "sonner";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod/v4";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { updateUsernameSchema } from "@/lib/universal/schema/auth";

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
        toast.success("Your username has been updated.");
        router.refresh();
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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input placeholder={placeholder} data-1p-ignore {...field} />
                  <Submit isPending={mutation.isPending} />
                </div>
              </FormControl>
              <FormDescription>
                Not <span className="italic">currently</span> shown anywhere.
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
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Save className="w-4 h-4" />
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
