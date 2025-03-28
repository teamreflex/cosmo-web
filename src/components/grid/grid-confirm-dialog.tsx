import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";
import { useLocalStorage } from "usehooks-ts";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

type Props = {
  onConfirm: () => void;
  canComplete: boolean;
  isPending: boolean;
};

export default function GridConfirmDialog({
  onConfirm,
  canComplete,
  isPending,
}: Props) {
  const [hideDialog, setHideDialog] = useLocalStorage(
    "hide-grid-confirm",
    () => false
  );

  // dialog has been dismissed previously
  if (hideDialog) {
    return (
      <Button
        variant="cosmo"
        onClick={onConfirm}
        disabled={!canComplete || isPending}
      >
        <span>Complete Grid</span>
        {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
      </Button>
    );
  }

  function handleDialogConfirm(form: FormData) {
    const dontShowAgain = form.get("dontShowAgain");
    onConfirm();
    setHideDialog(dontShowAgain === "on");
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="cosmo" disabled={!canComplete || isPending}>
          <span>Complete Grid</span>
          {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <form className="contents" action={handleDialogConfirm}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ol className="px-4 list-decimal">
                <li>
                  All objekts selected for the grid will become unsendable.
                </li>
                <li>
                  All objekts selected for the grid cannot be used again to
                  complete another grid.
                </li>
              </ol>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex items-center gap-2">
            <Checkbox name="dontShowAgain" />
            <Label>Don&apos;t show this again</Label>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button className="text-cosmo" type="submit" disabled={isPending}>
              <span>Complete Grid</span>
              {isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
