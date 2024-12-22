import { ObjektList } from "@/lib/universal/objekts";
import { Button } from "../ui/button";
import { LuPencil } from "react-icons/lu";
import { TbLoader2 } from "react-icons/tb";
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
  objektList: ObjektList;
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
            <LuPencil />
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
              {isPending && <TbLoader2 className="ml-2 animate-spin" />}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </form>
  );
}
