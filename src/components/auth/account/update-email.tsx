import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
  useFormField,
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
import { Loader2, Save } from "lucide-react";
import { updateEmailSchema } from "@/lib/universal/schema/auth";

type Props = {
  email: string;
};

export default function UpdateEmail({ email }: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateEmailSchema>) => {
      const result = await authClient.changeEmail({
        newEmail: data.email,
      });
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm({
    resolver: zodResolver(updateEmailSchema),
    defaultValues: {
      email,
    },
  });

  function handleSubmit(data: z.infer<typeof updateEmailSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast({
          description:
            "An email has been sent to verify your new email address.",
        });
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="flex items-center gap-2">
                  <Input
                    type="email"
                    placeholder="me@example.com"
                    data-1p-ignore
                    {...field}
                  />

                  <Submit isPending={mutation.isPending} />
                </div>
              </FormControl>
              <FormDescription>
                If changing email address, you will be sent a verification
                email.
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
