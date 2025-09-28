import { HelpCircle } from "lucide-react";
import VisuallyHidden from "../ui/visually-hidden";
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
import { Button } from "@/components/ui/button";

export default function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="rounded-full" variant="secondary" size="profile">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <VisuallyHidden>
          <AlertDialogHeader>
            <AlertDialogTitle>Help: Objekts</AlertDialogTitle>
            <AlertDialogDescription>
              Help information for the objekt index
            </AlertDialogDescription>
          </AlertDialogHeader>
        </VisuallyHidden>
        <div className="flex flex-col gap-4 text-sm text-foreground/80">
          {/* search */}
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-foreground">Search</h3>
            <p>
              The search bar is case-insensitive, has typo tolerance and
              supports shortcuts.
            </p>
            <p>Shortcut examples:</p>
            <ul className="list-inside list-disc">
              <li>
                Unit names: <code>oec</code>, <code>lovelution</code>,{" "}
                <code>vv</code>. These will search for objekts from members in
                the unit.
              </li>
              <li>
                S numbers: <code>s15</code> will return Xinyu objekts.
              </li>
              <li>
                Nicknames: <code>soda</code> will return DaHyun objekts.
              </li>
              <li>
                Collections: <code>a213z</code> will return Atom 213Z objekts.
              </li>
            </ul>
            <p>
              Searching via description is also available: <code>cherry</code>{" "}
              will return objekts from the 2025 Cherry Blossom event.
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
