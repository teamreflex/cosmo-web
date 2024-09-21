"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HelpCircle, Sparkles } from "lucide-react";
import { Button } from "../ui/button";

export default function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="profile">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>COMO Calendar</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div className="flex flex-col gap-1">
            <p>
              Dates and times of your daily COMO drops may not perfectly align
              with COSMO due to timezones and batches.
            </p>

            <span>
              A <Sparkles className="inline-block text-yellow-600 h-5 w-5" />{" "}
              icon denotes that a drop is scheduled to happen on a day that does
              not exist in the current month, and will instead be carried over
              to the next month.
            </span>

            <p>
              For example, COMO scheduled to drop on June 31st, will drop in
              July on the 30th.
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
