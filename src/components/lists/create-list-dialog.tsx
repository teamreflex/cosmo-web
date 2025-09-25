import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useForm, useFormState } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { createObjektListSchema } from "../../lib/universal/schema/objekt-list";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { createObjektList } from "./actions";
import type z from "zod";
import { track } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
};

export default function CreateListDialog({ open, onOpenChange }: Props) {
  const mutationFn = useServerFn(createObjektList);
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      // TODO: insert into cache
      track("create-list");
      toast.success("Objekt list created!");
      onOpenChange(false);
    },
  });

  const form = useForm<z.infer<typeof createObjektListSchema>>({
    resolver: standardSchemaResolver(createObjektListSchema),
    defaultValues: {
      name: "",
    },
  });

  async function handleSubmit(data: z.infer<typeof createObjektListSchema>) {
    await mutation.mutateAsync({ data });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Objekt List</DialogTitle>
          <DialogDescription>
            You can add objekts to the list later.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="w-full flex flex-col gap-2"
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
      <span>Create</span>
      {isSubmitting && <Loader2 className="animate-spin" />}
    </Button>
  );
}
