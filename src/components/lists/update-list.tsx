import type { List } from "@/lib/server/db/schema";
import { Button } from "../ui/button";
import { Edit, Loader2 } from "lucide-react";
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
import { FieldError } from "../form/error";
import { useActionState } from "react";

type Props = {
  objektList: List;
};

export default function UpdateList({ objektList }: Props) {
  const [state, formAction, isPending] = useActionState(update, {
    status: "idle",
  });

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

            <Button type="submit" disabled={isPending}>
              <span>Save</span>
              {isPending && <Loader2 className="ml-2 animate-spin" />}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
}
