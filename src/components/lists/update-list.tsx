import type { ObjektList } from "@/lib/server/db/schema";
import { Button } from "../ui/button";
import { Edit, Loader2 } from "lucide-react";
import { updateObjektList } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateObjektListSchema } from "./schema";
import { useFormStatus } from "react-dom";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

type Props = {
  objektList: ObjektList;
};

export default function UpdateList({ objektList }: Props) {
  const { form, handleSubmitWithAction } = useHookFormAction(
    updateObjektList,
    zodResolver(updateObjektListSchema),
    {
      formProps: {
        defaultValues: {
          id: objektList.id,
          name: objektList.name,
        },
      },
    }
  );

  return (
    <Dialog>
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
            onSubmit={handleSubmitWithAction}
            className="w-full flex flex-col gap-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Want To Trade" {...field} />
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
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      <span>Save</span>
      {pending && <Loader2 className="ml-2 animate-spin" />}
    </Button>
  );
}
