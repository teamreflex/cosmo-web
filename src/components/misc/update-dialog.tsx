import { Newspaper } from "lucide-react";
import { addDays, format, isWithinInterval, subDays } from "date-fns";
import { useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import VisuallyHidden from "../ui/visually-hidden";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { env } from "@/lib/env/client";

export default function UpdateDialog() {
  const isNew = useMemo(() => {
    const latest = updates[0];
    if (!latest) return false;

    return isWithinInterval(latest.date, {
      start: subDays(new Date(), 2),
      end: addDays(new Date(), 2),
    });
  }, []);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="relative flex h-8 w-9 items-center justify-center rounded-r-md bg-cosmo-text/25 transition-colors hover:bg-cosmo-text/40">
          <Newspaper className="h-5 w-5 text-cosmo-text" />
          {isNew && (
            <span className="absolute top-0 right-0 h-2 w-2 animate-pulse rounded-full bg-red-500" />
          )}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{env.VITE_APP_NAME} Updates</AlertDialogTitle>
          <VisuallyHidden>
            <AlertDialogDescription>
              {env.VITE_APP_NAME} Updates
            </AlertDialogDescription>
          </VisuallyHidden>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 text-sm">
          <Accordion type="single" collapsible>
            {updates.map((update) => (
              <AccordionItem key={update.date} value={update.date}>
                <AccordionTrigger>
                  {format(update.date, "MMMM do y")}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-inside list-disc">
                    {update.changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const updates = [
  {
    date: "2025-08-24",
    changes: [
      "Custom objekt borders/bands (idntt) are now supported.",
      "These will be added into the system as we receive them. Until then, a default band will be used based on the objekt color settings.",
    ],
  },
];
