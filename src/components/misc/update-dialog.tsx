import { Newspaper } from "lucide-react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { addDays, format, isWithinInterval, subDays } from "date-fns";
import { env } from "@/env";
import VisuallyHidden from "../ui/visually-hidden";

export default function UpdateDialog() {
  const isNew = isWithinInterval(updates[0].date, {
    start: subDays(new Date(), 2),
    end: addDays(new Date(), 2),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="relative h-8 w-9 flex justify-center items-center rounded-r-lg bg-cosmo-text/25 hover:bg-cosmo-text/40 transition-colors">
          <Newspaper className="text-cosmo-text w-5 h-5" />
          {isNew && (
            <span className="absolute top-0 right-0 rounded-full h-2 w-2 bg-red-500 animate-pulse" />
          )}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {env.NEXT_PUBLIC_APP_NAME} Updates
          </AlertDialogTitle>
          <VisuallyHidden>
            <AlertDialogDescription>
              {env.NEXT_PUBLIC_APP_NAME} Updates
            </AlertDialogDescription>
          </VisuallyHidden>
        </AlertDialogHeader>

        <div className="flex flex-col text-sm gap-2">
          <Accordion type="single" collapsible>
            {updates.map((update) => (
              <AccordionItem key={update.date} value={update.date}>
                <AccordionTrigger>
                  {format(update.date, "MMMM do y")}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc list-inside">
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
    date: "2025-05-19",
    changes: [
      "User accounts are now available. Sign in via Discord, Twitter or email & password.",
      "Objekt lists can be created again, linked to your user account instead of COSMO ID.",
      // "COSMO IDs can be linked and verified via a one-time QR code sign in. This will import any old objekt lists, and allow objekt pins and locking again.",
    ],
  },
  {
    date: "2025-05-17",
    changes: [
      "Gravity results are now available. Pre-migration gravity data has been imported, and any future gravity results should be realtime.",
      "All objekts have had their received time fixed, so collections are now properly sorted.",
      "Objekt lists are being migrated to a new system, nothing has been lost.",
    ],
  },
];
