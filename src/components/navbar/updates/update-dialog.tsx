import { Newspaper } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { addDays, format, isWithinInterval, subDays } from "date-fns";
import { env } from "@/env.mjs";

export default function UpdateDialog() {
  const isNew = isWithinInterval(updates[0].date, {
    start: subDays(new Date(), 2),
    end: addDays(new Date(), 2),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="relative flex justify-center items-center py-1 px-2 rounded-xl bg-cosmo-text bg-opacity-25 hover:bg-opacity-40 transition-colors">
          <Newspaper className="text-cosmo-text w-6 h-6" />
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
    date: "2024-02-16",
    changes: [
      "Added: Rekord archive page.",
      `Added: "Hidden" and "Expired" indicators on My Rekords page.`,
      "Changed: When signed in, the user search will query Cosmo. When not signed in, it will lookup users saved into the system.",
    ],
  },
  {
    date: "2024-02-13",
    changes: [
      "Implemented Rekord functionality.",
      "Submitting new rekord posts will not supported.",
    ],
  },
  {
    date: "2024-02-04",
    changes: [
      "Fixed: Error on COMO calendars when there is a drop being carried over.",
      "Fixed: ARTMS COMO icon getting cut off on mobile.",
      "Fixed: New or empty objekt lists no longer display every possible objekt.",
    ],
  },
  {
    date: "2024-01-27",
    changes: [
      "Added: Visual display of obtained/missing objekts on progress pages.",
      "Fixed: Scrolling member filter images getting cut off and not displaying on iOS.",
    ],
  },
  {
    date: "2024-01-19",
    changes: [
      `Due to Cosmo changes, searching for users now requires signing in. This also applies to viewing profiles that haven't been added into the system.`,
      "Profiles that have been added to the system can continue to be viewed without signing in.",
    ],
  },
];
