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
          type="button"
          className="relative flex h-8 w-9 items-center justify-center rounded-r-sm border border-cosmo/40 bg-cosmo/25 shadow-sm transition-colors hover:bg-cosmo/40"
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
    date: "2026-04-30",
    changes: [
      "More redesign work, should be more mobile friendly and less janky.",
      "Added: Per-objekt pricing stats, based on all available sale lists. Shows min/max/median in USD.",
      "Added: Dedicated 'have' and 'want' objekt lists that when paired together, can show users with mutual matches. 'have' lists will only accept objekts you own per serial, entries are automatically removed when you send them to another user, and you are notified when someone updates a 'have' list and matches with you.",
      "Added: Objekt lists can now have descriptions.",
      "Updated: Objekt lists now display individual entries rather than merging duplicates into one.",
      "Updated: Objekt information dialogs have been redesigned to be more mobile friendly.",
      "Updated: Owned objekt collection view has been redesigned to surface more detail rather than just replicating what COSMO shows.",
      "Updated: Filters now display all the time on mobile rather than being collapsed into a toggle.",
      "Updated: Sale lists now enforce selecting a specific objekt/serial when adding an entry. After some time, we will start automatically removing entries upon transfer just like 'have' lists.",
      "Updated: Pins are removed upon sending the objekt to another user.",
      "Fixed: Locked & Transferable filters are more clear in their behavior.",
    ],
  },
  {
    date: "2026-03-26",
    changes: [
      "Added: Japanese and French translations (thanks Azagal).",
      "Added: Icon denoting when an MCO hasn't had its video loaded in yet.",
      "Fixed: COSMO error causing objekts to be missing serials and back-face images.",
      "Fixed: Progress charts no longer filter out entries under 1%.",
      "Updated: Leaderboards now update at 9am KST every day rather than every hour.",
    ],
  },
];
