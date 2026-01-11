import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { IconSpeakerphone } from "@tabler/icons-react";
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
          <IconSpeakerphone className="h-5 w-5 text-cosmo-text" />
          {isNew && (
            <span className="absolute top-0 right-0 h-2 w-2 animate-pulse rounded-full bg-red-500" />
          )}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent size="lg">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {m.updates_title({ appName: env.VITE_APP_NAME })}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {m.updates_title({ appName: env.VITE_APP_NAME })}
          </AlertDialogDescription>
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
          <AlertDialogAction>{m.common_continue()}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const updates = [
  {
    date: "2026-01-15",
    changes: [
      "Added: Translations, starting with support for Korean.",
      "Added: Event catalog system - an easy way of viewing past and ongoing objekt drops.",
      "Added: Scroll to top and objekt band toggle (idntt only) buttons.",
      "Updated: The design of the artist/member filter to better accommodate more artists.",
      "Updated: Other design tweaks and improvements such as a new font and color scheme.",
      "Updated: Moved the about dialog to the user dropdown, logo now links to the home page.",
      "Updated: Brought back gravity vote results per user.",
      "Fixed: Objekt info popups now drag-to-close correctly on mobile.",
      "Fixed: Past gravity events now correctly show as completed.",
      "Fixed: Gravity vote percentage no longer rounds up whole numbers.",
      "Fixed: Objekt lists now sort correctly.",
      "Fixed: idntt seasons are now sorted correctly on the progress page.",
    ],
  },
];
