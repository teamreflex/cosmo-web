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
        <button
          className="relative flex h-8 w-9 items-center justify-center rounded-r-md border border-cosmo/40 bg-cosmo/25 shadow-sm transition-colors hover:bg-cosmo/40"
          aria-label={m.aria_updates()}
        >
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
    date: "2026-03-25",
    changes: [
      "Added: Japanese and French translations (thanks Azagal).",
      "Added: Icon denoting when an MCO hasn't had its video loaded in yet.",
      "Fixed: COSMO error causing objekts to be missing serials and back-face images.",
      "Updated: Leaderboards now update at 9am KST every day rather than every hour.",
    ],
  },
  {
    date: "2026-02-23",
    changes: [
      "Added: Filters and sort options for events.",
      "Added: Objekt lists can now have prices and quantities assigned, good for doing sale lists.",
    ],
  },
];
