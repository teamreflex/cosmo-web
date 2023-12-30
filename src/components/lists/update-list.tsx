import { ObjektList } from "@/lib/universal/objekts";
import { Button } from "../ui/button";
import { Edit, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { update } from "./actions";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useToast } from "../ui/use-toast";
import { Route } from "next";

type Props = {
  objektList: ObjektList;
};

export default function UpdateList({ objektList }: Props) {
  const [name, setName] = useState(objektList.name);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      const result = await update({ id: objektList.id, name });
      if (result.success) {
        toast({
          description: `Updated ${objektList.name}`,
        });
        router.push(result.data as Route);
      } else {
        setError(result.error);
      }
    });
  }

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
          <div className="w-full flex flex-col gap-1">
            <Label htmlFor="name">Name</Label>
            <Input
              type="text"
              autoComplete="off"
              maxLength={24}
              value={name}
              onInput={(e) => setName(e.currentTarget.value)}
              id="name"
              placeholder="Want To Trade"
              data-1p-ignore
            />
            <p className="text-red-500 text-sm font-semibold">{error}</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending} onClick={submit}>
              {isPending ? "Saving..." : "Save"}
              {isPending && <Loader2 className="ml-2 animate-spin" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
