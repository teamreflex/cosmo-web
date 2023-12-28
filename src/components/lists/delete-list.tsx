import { ObjektList } from "@/lib/universal/objekts";
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
import { MouseEvent, useTransition } from "react";
import { destroy } from "./actions";
import { useRouter } from "next/navigation";

type Props = {
  list: ObjektList;
};

export default function DeleteList({ list }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit(event: MouseEvent<HTMLButtonElement>) {
    // prevent alert from dismissing on click
    event.preventDefault();

    startTransition(async () => {
      const result = await destroy({ id: list.id });
      if (result.success && result.data) {
        router.push("/objekts");
      }
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
            This will permanently delete <b>{list.name}</b>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={submit} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
            {isPending && <Loader2 className="ml-2 animate-spin" />}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
