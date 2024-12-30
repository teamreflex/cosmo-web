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
import { env } from "@/env.mjs";
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
    date: "2024-12-30",
    changes: [
      "Up to 5 objekts can now be sent at once. These will send in order of selection one at a time and will cancel the rest of the batch if one fails.",
      "Profile pages now display grouped by collection like COSMO does.",
      "Grouped mode only applies while viewing your own profile when signed in. Viewing other profiles will use the old COSMO mode, which MODHAUS may remove in the future.",
      "Objekt rewards are now claimed from a button in the bottom right of the screen while on your own profile. The card no longer shows up at the top of your collection.",
    ],
  },
  {
    date: "2024-12-23",
    changes: [
      "Adjusted a couple icons to better represent the button's purpose.",
      "Reduced reliance on COSMO: Profile images update every 24 hours.",
      "Using new COSMO data: Member filters now show their representative color when selected.",
      "Profiles should more reliably update when COSMO IDs change.",
      "COSMO profile details can now be refreshed from settings. This will update your ID from COSMO based on your currently signed in account, refresh your profile images, and pull your selected artist from COSMO.",
    ],
  },
  {
    date: "2024-12-07",
    changes: ["Hopefully fixed instances of Google Translate breaking pages."],
  },
];
