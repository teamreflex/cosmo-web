import { TbLoader2 } from "react-icons/tb";
import { FieldError } from "../form/error";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useState, useTransition } from "react";
import { TypedActionResult } from "@/lib/server/typed-action/types";
import { create } from "./actions";
import { track } from "@/lib/utils";
import { toast } from "../ui/use-toast";
import { useRouter } from "next/navigation";

type Props = {
  open: boolean;
  onOpenChange: (state: boolean) => void;
};

export default function CreateListDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<TypedActionResult<boolean>>({
    status: "idle",
  });

  function createNewList(form: FormData) {
    startTransition(async () => {
      const result = await create(form);
      setState(result);

      if (result.status === "success") {
        track("create-list");
        router.refresh();
        toast({
          description: "Objekt list created!",
        });
        onOpenChange(false);
      }
    });
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
        <form className="w-full flex flex-col gap-3" action={createNewList}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              autoComplete="off"
              maxLength={24}
              id="name"
              name="name"
              placeholder="Want To Trade"
              data-1p-ignore
            />
            <FieldError state={state} field="name" />
          </div>

          <Button type="submit" disabled={isPending}>
            <span>Create</span>
            {isPending && <TbLoader2 className="ml-2 animate-spin" />}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
