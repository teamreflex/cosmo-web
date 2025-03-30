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
        <button className="relative h-8 w-9 flex justify-center items-center rounded-r-lg bg-cosmo-text/25 hover:bg-cosmo-text/40 transition-colors cursor-pointer">
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
    date: "2025-03-30",
    changes: [
      "Grid confirmation dialog now has an option to not ask for confirmation again.",
      "Objekt list Discord formatting now sorts members by debut order.",
    ],
  },
  {
    date: "2025-03-12",
    changes: [
      "Privacy settings for IDs, collections, COMO and trades have been removed as they've become redundant.",
      "Gravity voting privacy is still available and has been moved into settings.",
      "Sorting objekts by serial will now automatically switch to Polygon.",
      "Updated design of the progress page.",
      "Expanded width of the site for desktop users.",
      "Small Firefox fixes.",
    ],
  },
  {
    date: "2025-03-04",
    changes: [
      "Implemented objekt spinning.",
      "Transfers sent to COSMO spin are now displayed as such, instead of showing the @cosmo-spin user.",
      "Added a 'Spin' filter to the transfer page to filter for transfers to COSMO spin.",
      "Added an icon to the profiles of official Modhaus accounts.",
      "Added a Polygon blockchain collection grouping option to profile pages.",
      "Objekts on progress pages now bring up information dialogs when clicked.",
      "@cosmo-spin has been excluded from leaderboards.",
    ],
  },
];
