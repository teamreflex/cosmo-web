import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";

export default function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger>
        <AlertCircle className="w-4 h-4 drop-shadow-lg" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-4">
              {/* index */}
              <div className="flex flex-col gap-1">
                <h3 className="text-white text-lg font-semibold">Index</h3>
                <p>View a complete listing of every objekt ever released.</p>
              </div>

              {/* lists */}
              <div className="flex flex-col gap-1">
                <h3 className="text-white text-lg font-semibold">Lists</h3>
                <p>
                  Objekt lists allow you to create sharable links with any
                  objekts you add to it.
                </p>
                <p>
                  For example, you could create a list with any objekts you have
                  available for trade, or any that you&apos;re looking for. Like
                  a wishlist.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
