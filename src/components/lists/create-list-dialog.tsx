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
import { useHookFormAction } from "@next-safe-action/adapter-react-hook-form/hooks";
import { zodResolver } from "@hookform/resolvers/zod";
import { createObjektListSchema } from "./schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useFormState } from "react-hook-form";
import { useRouter } from "next/navigation";

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
          router.refresh();
          track("create-list");
          toast({
            description: "Objekt list created!",
          });
          onOpenChange(false);
        },
      },
      formProps: {
        defaultValues: {
          name: "",
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
