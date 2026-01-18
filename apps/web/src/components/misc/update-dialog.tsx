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
        <button className="relative flex h-8 w-9 items-center justify-center rounded-r-md bg-cosmo/25 transition-colors hover:bg-cosmo/40 border border-cosmo/40 shadow-sm">
          <IconSpeakerphone className="h-5 w-5 text-cosmo-text/75" />
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
    date: "2026-01-19",
    changes: [
      "Fixed: Discord & Twitter sign in have been fixed.",
      "Fixed: Member filter how has a scroll bar on desktop when necessary.",
      "Fixed: Season filters on leaderboards now ignore selected artists.",
      "Fixed: Objekts within event pages are now sorted by collection creation.",
      "Fixed: Serial input no longer resets scroll position.",
      "Updated: Data for the @cosmo-spin account is now limited to the last month of received objekts and trades.",
    ],
  },
  {
    date: "2026-01-17",
    changes: [
      "Added: Translations, starting with support for Korean.",
      "Added: Event catalog system - an easy way of viewing past and ongoing objekt drops.",
      "Added: Objekt band toggle (idntt only) & scroll to top buttons.",
      "Updated: Linking COSMO accounts no longer requires signing in with QR codes.",
      "Updated: Artist/member filter has been redesigned.",
      "Updated: General design tweaks and improvements such as a new font and color scheme.",
      "Updated: Moved the about dialog to the user dropdown, logo now links to the home page.",
      "Updated: Gravity top votes & top users have returned.",
      "Fixed: Objekt info popups now drag-to-close correctly on mobile.",
      "Fixed: Gravities now correctly transition between states without needing to refresh the page.",
      "Other small fixes: Gravity vote percentage no longer rounds up whole numbers, objekt lists now sort correctly, idntt seasons are now sorted correctly on the progress page, classes are now sorted in order of collection number (FCO->SCO->DCO->PCO->MCO).",
    ],
  },
];
