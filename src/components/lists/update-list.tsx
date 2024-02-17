import { ObjektList } from "@/lib/universal/objekts";
import { Button } from "../ui/button";
import { Edit, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { update } from "./actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useToast } from "../ui/use-toast";
import { useFormState, useFormStatus } from "react-dom";
import { FieldError } from "../form/error";

type Props = {
  objektList: ObjektList;
};

export default function UpdateList({ objektList }: Props) {
  const { toast } = useToast();

  const [state, formAction] = useFormState(update, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      toast({
        description: `Objekt list updated!`,
      });
    }
  }, [state.status, toast]);

  return (
    <form>
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
          <form className="w-full flex flex-col gap-3" action={formAction}>
            <input
              type="number"
              value={objektList.id}
              name="id"
              hidden
              readOnly
            />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                type="text"
                autoComplete="off"
                maxLength={24}
                defaultValue={objektList.name}
                id="name"
                name="name"
                placeholder="Want To Trade"
                data-1p-ignore
              />
              <FieldError state={state} field="name" />
            </div>

            <SubmitButton />
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : "Save"}
      {pending && <Loader2 className="ml-2 animate-spin" />}
    </Button>
  );
}
