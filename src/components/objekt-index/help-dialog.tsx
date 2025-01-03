import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HelpCircle } from "lucide-react";
import { Button } from "../ui/button";
import VisuallyHidden from "../ui/visually-hidden";

export default function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="profile">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <VisuallyHidden>
          <AlertDialogHeader>
            <AlertDialogTitle>Help: Objekts</AlertDialogTitle>
            <AlertDialogDescription>
              Help information for objekt index
            </AlertDialogDescription>
          </AlertDialogHeader>
        </VisuallyHidden>

        <div className="flex flex-col gap-4 text-sm text-foreground/80">
          {/* index */}
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg font-semibold">Index</h3>
            <p>View a complete listing of every objekt ever released.</p>
          </div>

          {/* lists */}
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg font-semibold">Lists</h3>
            <p>
              Objekt lists allow you to create sharable links with any objekts
              you add to it.
            </p>
            <p>
              For example, you could create a list with any objekts you have
              available for trade, or any that you&apos;re looking for. Like a
              wishlist.
            </p>
          </div>

          {/* source */}
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg font-semibold">Source</h3>
            <p>
              Click an objekt to view detailed information such as edition,
              number of copies and source of the objekt.
            </p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
