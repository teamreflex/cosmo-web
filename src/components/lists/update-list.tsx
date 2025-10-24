import { Edit, Loader2 } from "lucide-react";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm, useFormState } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { updateObjektListSchema } from "../../lib/universal/schema/objekt-list";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { $updateObjektList } from "./actions";
import type z from "zod";
import type { ObjektList } from "@/lib/server/db/schema";
import { useUserState } from "@/hooks/use-user-state";
import { currentAccountQuery, targetAccountQuery } from "@/lib/queries/core";

type Props = {
  objektList: ObjektList;
};

export default function UpdateList({ objektList }: Props) {
  const [open, setOpen] = useState(false);
  const { cosmo } = useUserState();
  const queryClient = useQueryClient();
  const mutationFn = useServerFn($updateObjektList);
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success("Objekt list updated");
      // invalidate current account query to update list name in user's lists
      queryClient.invalidateQueries({
        queryKey: currentAccountQuery.queryKey,
      });
      // invalidate target account queries to update list name on profile pages
      if (cosmo) {
        queryClient.invalidateQueries({
          queryKey: targetAccountQuery(cosmo.username).queryKey,
        });
      }
      setOpen(false);
    },
  });

  const form = useForm<z.infer<typeof updateObjektListSchema>>({
    resolver: standardSchemaResolver(updateObjektListSchema),
    defaultValues: {
      id: objektList.id,
      name: objektList.name,
    },
  });

  async function handleSubmit(data: z.infer<typeof updateObjektListSchema>) {
    await mutation.mutateAsync({
      data,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" className="rounded-full">
          <Edit />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Objekt List</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex w-full flex-col gap-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Want To Trade"
                      data-1p-ignore
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SubmitButton />
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { isSubmitting } = useFormState();

  return (
    <Button type="submit" disabled={isSubmitting}>
      <span>Save</span>
      {isSubmitting && <Loader2 className="animate-spin" />}
    </Button>
  );
}
