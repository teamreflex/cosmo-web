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
import { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  onConfirm: () => void;
}>;

export default function GridConfirmDialog({ children, onConfirm }: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Before you complete a grid</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <ol className="px-4 list-decimal">
              <li>
                You can&apos;t send the First Objekt used for the Grid Challenge
                to others.
              </li>
              <li>
                The First Objekt cannot be used again to complete another Grid
                Challenge.
              </li>
              <li>
                Still, the First Objekt used to get Special Objekt will safely
                appear in your Collect tab.
              </li>
            </ol>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Go back</AlertDialogCancel>
          <AlertDialogAction className="text-cosmo" onClick={onConfirm}>
            I get it!
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
