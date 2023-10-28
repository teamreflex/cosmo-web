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
import { env } from "@/env.mjs";
import { AlertCircle, Grid2X2, Lock, MailX } from "lucide-react";

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
              {/* objekt locking */}
              <div className="flex flex-col gap-1">
                <h3 className="text-white text-xl font-bold">Objekt Locking</h3>
                <p>
                  Locking is much like locking a card in the SuperStar games, in
                  that it prevents sending until you explicitly unlock the
                  objekt. Useful for preventing accidental trading.
                </p>
                <p>
                  This is a {env.NEXT_PUBLIC_APP_NAME} feature and{" "}
                  <b>does not prevent trading within the Cosmo app</b>.
                </p>
              </div>

              {/* indicators */}
              <div className="flex flex-col gap-1">
                <h3 className="text-white text-xl font-bold">Indicators</h3>
                <p>
                  Different indicators in the top left denote different statuses
                  of an objekt.
                </p>
                <div className="flex flex-col gap-1 text-start">
                  {/* grid */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#FFDD00] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <Grid2X2 className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">
                      Objekt has been used in a grid
                    </p>
                  </div>

                  {/* unsendable */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#75FB4C] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <MailX className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">
                      Objekt is not transferable (ie; Welcome class, event drop)
                    </p>
                  </div>

                  {/* locked */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#FF7477] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <Lock className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">Objekt has been locked</p>
                  </div>
                </div>
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
