"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HelpCircle } from "lucide-react";
import { Button } from "../ui/button";

export default function HelpDialog() {
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
              <div className="flex flex-col gap-1">
                <h3 className="text-white text-lg font-semibold">
                  COMO Calendar
                </h3>
                <p>
                  Due to differences between Cosmo registering an objekt as
                  received, and it being minted on-chain, there may be cases
                  where the calendar says it will be received a day after Cosmo
                  says it will be received.
                </p>

                <p>
                  For example: An objekt received via gridding at 11:45PM on the
                  8th may have taken a while to be minted.
                </p>
                <p>
                  Cosmo will register it&apos;s COMO drop date as the 8th, while
                  the data here will register the drop date as the 9th, as the
                  objekt was minted at 12:02AM on the 9th.
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
