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
    date: "2025-01-19",
    changes: [
      "Trades page now supports filtering by season, class, member, artist and mint/received/sent.",
    ],
  },
  {
    date: "2025-01-08",
    changes: [
      "Modhaus has unfortunately removed the ability to view other user's collections via COSMO, so now the only option is via blockchain data.",
    ],
  },
  {
    date: "2025-01-07",
    changes: [
      "Fixed reward claiming.",
      "Fixed objekts with incorrect colors: Seoyeon Divine FCOs, Heejin <K> MMT DCOs, Choerry Binary SCOs",
      "Fixed upcoming gravities being displayed above ongoing gravities.",
      "Fixed objekt information popups being too tall for smaller phone screens.",
      "Added toggle to hide objekt buttons",
    ],
  },
  {
    date: "2025-01-03",
    changes: [
      "Updated maximum objekts that can be sent at once to 10.",
      "Removed rarity from objekt information as the number of copies no longer correlates with rarity.",
      "Added an 'unobtainable' label to objekts that are no longer obtainable though normal means, such as limited time events.",
      "Progress and leaderboard now exclude unobtainable objekts. If you have 100% for a season/class and own an unobtainable, it will be shown and your percentage will go over 100%.",
      "Unobtainables include: Mayu B101A-B108A, tripleS D312Z, JinSoul A109A, ARTMS A346Z, ARTMS A351Z, ARTMS B310Z.",
    ],
  },
];
