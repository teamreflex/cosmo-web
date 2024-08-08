import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
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
  Smartphone,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { ReactNode } from "react";

type Props = {
  previousIds: ReactNode;
};

export default function HelpDialog({ previousIds }: Props) {
  const str = env.NEXT_PUBLIC_APP_NAME.toLowerCase().match(/^[aeiou]/i)
    ? "an"
    : "a";

  return (
    <AlertDialog>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <AlertDialogTrigger asChild>
            <TooltipTrigger asChild>
              <Button className="rounded-full" variant="secondary" size="icon">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
          </AlertDialogTrigger>
          <TooltipContent side="bottom">Help</TooltipContent>
          <AlertDialogContent>
            <div className="flex flex-col gap-4">
              {/* grid/column size */}
              <div className="flex flex-col gap-1 text-sm text-foreground/80">
                <h3 className="text-lg font-semibold text-foreground">
                  Grid Size
                </h3>
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
                  anything you don&apos;t want to accidentally send or to
                  indicate to other people that it is not up for trade.
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
                  Different indicators in the top left denote different statuses
                  of an objekt.
                </p>
                <div className="flex flex-col gap-1 text-start">
                  {/* locked */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#FFDD00] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <Lock className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-sm">
                      Objekt has been locked
                    </p>
                  </div>

                  {/* mint pending */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#75FB4C] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <DownloadCloud className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-sm">
                      Objekt has not been minted yet
                    </p>
                  </div>

                  {/* grid */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#FF7477] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <Grid2X2 className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-sm">
                      Objekt has been used in a grid (not transferable)
                    </p>
                  </div>

                  {/* welcome */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#FFFFFF] text-black rounded-lg p-1 flex items-center justify-center w-fit">
                      <MailX className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-sm">
                      Objekt is a welcome reward (not transferable)
                    </p>
                  </div>

                  {/* event reward */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#8A8C8E] text-white rounded-lg p-1 flex items-center justify-center w-fit">
                      <PartyPopper className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-sm">
                      Objekt is an event reward (not transferable)
                    </p>
                  </div>

                  {/* lenticular */}
                  <div className="flex gap-2 items-center">
                    <div className="bg-[#294a80] text-white rounded-lg p-1 flex items-center justify-center w-fit">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-sm">
                      Objekt is in a lenticular pair (not transferable)
                    </p>
                  </div>
                </div>
              </div>

              {previousIds}
            </div>

            <AlertDialogFooter>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </Tooltip>
      </TooltipProvider>
    </AlertDialog>
  );
}
