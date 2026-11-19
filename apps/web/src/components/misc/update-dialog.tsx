import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { m } from "@/i18n/messages";
import { getLocale } from "@/i18n/runtime";
import { env } from "@/lib/env/client";
import { DISCORD_URL } from "@/lib/utils";
import { IconBrandDiscord, IconSpeakerphone } from "@tabler/icons-react";
import { addDays, isWithinInterval, subDays } from "date-fns";
import { useState } from "react";
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
import { Button } from "../ui/button";

export default function UpdateDialog() {
  const [isNew] = useState(() => {
    const latest = updates[0];
    if (!latest) return false;

    const now = new Date();
    return isWithinInterval(latest.date, {
      start: subDays(now, 2),
      end: addDays(now, 2),
    });
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger
        className="relative flex h-7 w-8 items-center justify-center rounded-sm border border-cosmo/40 bg-cosmo/25 shadow-sm transition-colors hover:bg-cosmo/40 lg:h-8 lg:w-9"
        aria-label={m.aria_updates()}
      >
        <IconSpeakerphone className="h-5 w-5 text-cosmo-text/75" />
        {isNew && (
          <span className="absolute top-0 right-0 h-2 w-2 animate-pulse rounded-full bg-red-500" />
        )}
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
          <Accordion>
            {updates.map((update) => (
              <AccordionItem key={update.date} value={update.date}>
                <AccordionTrigger>
                  {new Intl.DateTimeFormat(getLocale(), {
                    dateStyle: "long",
                    timeZone: "UTC",
                  }).format(new Date(update.date))}
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
        <AlertDialogFooter className="sm:justify-between">
          <Button
            variant="discord"
            render={
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
                <IconBrandDiscord />
                <span>Discord</span>
              </a>
            }
          />
          <AlertDialogAction>{m.common_continue()}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const updates = [
  {
    date: "2026-11-19",
    changes: [
      "Transferable status for all objekts has been fixed and should now be accurate going forward.",
      "Account settings & preferences have been streamlined into a single page.",
      "Transfers can now be filtered by user.",
      "idntt members and their units have been added to search, so 'id1', 'unevermet' etc now work.",
      "Trade market is now available to everyone, designed to be as flexible as Discord trade channels.",
    ],
  },
];
