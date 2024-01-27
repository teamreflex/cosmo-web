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
import { addWeeks, format, isWithinInterval, subWeeks } from "date-fns";
import { env } from "@/env.mjs";

export default function UpdateDialog() {
  const isNew = isWithinInterval(new Date("2024-01-27"), {
    start: subWeeks(new Date(), 1),
    end: addWeeks(new Date(), 1),
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
  {
    date: "2024-01-15",
    changes: [
      "Added: Option to swap between Cosmo and Polygon for collection display.",
      "Added: Lowest Serial & Highest Serial sorting when using Polygon.",
    ],
  },
  {
    date: "2024-01-13",
    changes: [
      "Removed: Objekt sending, due to Ramper changes.",
      "Added: Privacy options for changing how much of your profile is publicly available.",
      "Added: Options to change the number of columns when displaying objekts.",
      "Added: Objekt indicators now show when an objekt is in a lenticular pair, which prevents sending.",
      "Added: Icon to indicate when a COMO drop has been carried over from the previous month, due to landing on the 31st.",
    ],
  },
];
