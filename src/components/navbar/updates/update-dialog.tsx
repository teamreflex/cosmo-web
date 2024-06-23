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
    date: "2024-06-21",
    changes: ["Added: Season filter to progress leaderboards"],
  },
  {
    date: "2024-06-20",
    changes: ["Added: History section to the new Activity tab."],
  },
  {
    date: "2024-06-05",
    changes: [
      "Fixed: Grid season selector now defaults to the current season.",
      "Added: Grid member selector now adds the selected member to the URL.",
      "Updated: Artist & member fetching is now cached for 12 hours, should reduce errors when COSMO is struggling with high traffic.",
    ],
  },
  {
    date: "2024-05-31",
    changes: ['Added: Activity page, replaces the old "My Page" page.'],
  },
  {
    date: "2024-05-24",
    changes: [
      "Added: Add Objekt to List button on profile pages.",
      "Updated: Replaced mobile navigation menu.",
      "Fixed: Failure to fetch gas price and COMO balances should no longer crash the page.",
      "Fixed: Reduced reliance on COSMO servers to fetch members, should reduce crashes when COSMO is struggling.",
      "Fixed: Small performance improvements, things should feel a little snappier. Artist selections have been reset to accomodate this.",
    ],
  },
];
