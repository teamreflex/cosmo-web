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
import { env } from "@/env";
import { HelpCircle, Lock, MailX } from "lucide-react";
import { Button } from "../ui/button";
import VisuallyHidden from "../ui/visually-hidden";

export default function HelpDialog() {
  const str = env.NEXT_PUBLIC_APP_NAME.toLowerCase().match(/^[aeiou]/i)
    ? "an"
    : "a";

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
            <AlertDialogTitle>Help: Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Help information for profiles
            </AlertDialogDescription>
          </AlertDialogHeader>
        </VisuallyHidden>
        <div className="flex flex-col gap-4">
          {/* grid/column size */}
          <div className="flex flex-col gap-1 text-sm text-foreground/80">
            <h3 className="text-lg font-semibold text-foreground">Grid Size</h3>
            <p>
              The number of columns to use when displaying objekts can be
              updated in your settings panel.
            </p>
            <p>Mobile will always use the default of 3 columns.</p>
          </div>

          {/* objekt locking */}
          <div className="flex flex-col gap-1 text-sm text-foreground/80">
            <h3 className="text-lg font-semibold text-foreground">
              Objekt Locking
            </h3>
            <p>
              Locking an objekt hides the send button, allowing you to mark
              anything you don&apos;t want to accidentally send or to indicate
              to other people that it is not up for trade.
            </p>
            <p>
              This is {str} {env.NEXT_PUBLIC_APP_NAME} feature and{" "}
              <b>does not prevent trading within the COSMO app</b>.
            </p>
          </div>

          {/* indicators */}
          <div className="flex flex-col gap-1 text-sm text-foreground/80">
            <h3 className="text-lg font-semibold text-foreground">
              Indicators
            </h3>
            <p>
              Different indicators in the top left denote different statuses of
              an objekt.
            </p>
            <div className="flex flex-col gap-1 text-start">
              {/* locked */}
              <div className="flex gap-2 items-center">
                <div className="bg-[#FFDD00] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                  <Lock className="h-5 w-5" />
                </div>
                <p className="font-semibold text-sm">Objekt has been locked</p>
              </div>

              {/* not transferable */}
              <div className="flex gap-2 items-center">
                <div className="bg-[#75FB4C] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                  <MailX className="h-5 w-5" />
                </div>
                <p className="font-semibold text-sm">
                  Objekt is not transferable
                </p>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
