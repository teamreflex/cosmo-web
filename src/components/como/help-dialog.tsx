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
import { HelpCircle, Sparkles } from "lucide-react";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export default function HelpDialog() {
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
            <AlertDialogHeader>
              <AlertDialogDescription asChild>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-white text-lg font-semibold">
                      COMO Calendar
                    </h3>
                    <p>
                      Dates and times of your daily COMO drops may not perfectly
                      align with Cosmo due to timezones and batches.
                    </p>

                    <span>
                      A{" "}
                      <Sparkles className="inline-block text-yellow-600 h-5 w-5" />{" "}
                      icon denotes that a drop is scheduled to happen on a day
                      that does not exist in the current month, and will instead
                      be carried over to the next month.
                    </span>

                    <p>
                      For example, COMO scheduled to drop on June 31st, will
                      drop in July on the 30th.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </Tooltip>
      </TooltipProvider>
    </AlertDialog>
  );
}
