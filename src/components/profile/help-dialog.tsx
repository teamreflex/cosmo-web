import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { env } from "@/env.mjs";
import {
  DownloadCloud,
  Grid2X2,
  HelpCircle,
  Lock,
  MailX,
  PartyPopper,
} from "lucide-react";
import { Button } from "../ui/button";

export default function HelpDialog() {
  const str = env.NEXT_PUBLIC_APP_NAME.toLowerCase().match(/^[aeiou]/i)
    ? "an"
    : "a";

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="rounded-full" variant="secondary" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-4">
              {/* objekt locking */}
              <div className="flex flex-col gap-1">
                <h3 className="text-white text-lg font-semibold">
                  Objekt Locking
                </h3>
                <p>
                  Locking an objekt hides the send button, allowing you to mark
                  anything you don&apos;t want to accidentally send or to
                  indicate to other people that it is not up for trade.
                </p>
                <p>
                  This is {str} {env.NEXT_PUBLIC_APP_NAME} feature and{" "}
                  <b>does not prevent trading within the Cosmo app</b>.
                </p>
              </div>

              {/* indicators */}
              <div className="flex flex-col gap-1">
                <h3 className="text-white text-lg font-semibold">Indicators</h3>
                <p>
                  Different indicators in the top left denote different statuses
                  of an objekt.
                </p>
                <div className="flex flex-col gap-1 text-start">
                  {/* locked */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#FFDD00] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <Lock className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">Objekt has been locked</p>
                  </div>

                  {/* mint pending */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#75FB4C] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <DownloadCloud className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">
                      Objekt has not been minted yet
                    </p>
                  </div>

                  {/* grid */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#FF7477] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <Grid2X2 className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">
                      Objekt has been used in a grid (not transferable)
                    </p>
                  </div>

                  {/* welcome */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#FFFFFF] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <MailX className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">
                      Objekt is a welcome reward (not transferable)
                    </p>
                  </div>

                  {/* event reward */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#8A8C8E] text-white rounded-lg p-1 flex items-center justify-center w-fit">
                      <PartyPopper className="h-5 w-5" />
                    </div>
                    <p className="font-semibold">
                      Objekt is an event reward (not transferable)
                    </p>
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
