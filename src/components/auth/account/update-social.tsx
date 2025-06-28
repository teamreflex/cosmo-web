import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { toast } from "sonner";
import { authClient, getAuthErrorMessage } from "@/lib/client/auth";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import type { z } from "zod/v4";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { updateSocialsSchema } from "@/lib/universal/schema/auth";
import { Switch } from "@/components/ui/switch";

type Props = {
  showSocials: boolean;
  discord?: string;
  twitter?: string;
};

export default function UpdateSocial(props: Props) {
  const router = useRouter();
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof updateSocialsSchema>) => {
      const result = await authClient.updateUser(data);
      if (result.error) {
        throw new Error(getAuthErrorMessage(result.error));
      }
      return result.data;
    },
  });

  const form = useForm<z.infer<typeof updateSocialsSchema>>({
    resolver: standardSchemaResolver(updateSocialsSchema),
    defaultValues: {
      showSocials: props.showSocials,
    },
  });

  function handleSubmit(data: z.infer<typeof updateSocialsSchema>) {
    mutation.mutate(data, {
      onSuccess: () => {
        toast.success("Settings updated.");
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
          name="showSocials"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <FormLabel>Show Socials</FormLabel>
                <FormDescription>
                  When enabled, any social accounts you sign-in with will be
                  displayed on your profile.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Submit isPending={mutation.isPending} />
      </form>
    </Form>
  );
}

function Submit(props: { isPending: boolean }) {
  return (
    <Button className="ml-auto w-fit" type="submit" disabled={props.isPending}>
      <span>Save</span>
      {props.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
    </Button>
  );
}
