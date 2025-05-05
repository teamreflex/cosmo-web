import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { createObjektList } from "./actions";
import { track } from "@/lib/utils";
import { toast } from "../ui/use-toast";
import { useRouter } from "next/navigation";
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { createObjektListSchema } from "./schema";
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
  open: boolean;
  onOpenChange: (state: boolean) => void;
};

export default function CreateListDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { form, handleSubmitWithAction } = useHookFormAction(
    createObjektList,
    zodResolver(createObjektListSchema),
    {
      actionProps: {
        onSuccess: () => {
          track("create-list");
          router.refresh();
          toast({
            description: "Objekt list created!",
          });
          onOpenChange(false);
        },
      },
    }
  );

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
      <span>Create</span>
      {pending && <Loader2 className="ml-2 animate-spin" />}
    </Button>
  );
}
