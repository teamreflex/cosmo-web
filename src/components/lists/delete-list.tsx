import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "../ui/button";
import { Loader2, Trash } from "lucide-react";
import { MouseEvent } from "react";
import { deleteObjektList } from "./actions";
import type { ObjektList } from "@/lib/server/db/schema";
import { useAction } from "next-safe-action/hooks";

type Props = {
  objektList: ObjektList;
};

export default function DeleteList({ objektList }: Props) {
  const { execute, isPending } = useAction(deleteObjektList);

  function submit(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    execute({
      id: objektList.id,
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon" className="rounded-full">
          <Trash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <b>{objektList.name}</b>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={submit} disabled={isPending}>
            <span>Delete</span>
            {isPending && <Loader2 className="ml-2 animate-spin" />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
