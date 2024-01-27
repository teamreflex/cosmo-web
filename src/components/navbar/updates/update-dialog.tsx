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
import { addWeeks, isWithinInterval, subWeeks } from "date-fns";

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
          <AlertDialogTitle>Updates</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col text-sm gap-2">
          <Accordion type="single" collapsible>
            {/* 240127 */}
            <AccordionItem value="240127">
              <AccordionTrigger>January 27th 2024</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside">
                  <li>
                    Added: Visual display of obtained/missing objekts on
                    progress pages.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* 240119 */}
            <AccordionItem value="240119">
              <AccordionTrigger>January 19th 2024</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside">
                  <li>
                    Due to Cosmo changes, searching for users now requires
                    signing in. This also applies to viewing profiles that
                    haven&apos;t been added into the system.
                  </li>
                  <li>
                    Profiles that have been added to the system can continue to
                    be viewed without signing in.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* 240115 */}
            <AccordionItem value="240115">
              <AccordionTrigger>January 15th 2024</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside">
                  <li>
                    Added: Option to swap between Cosmo and Polygon for
                    collection display.
                  </li>
                  <li>
                    Added: Lowest Serial & Highest Serial sorting when using
                    Polygon.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            {/* 240113 */}
            <AccordionItem value="240113">
              <AccordionTrigger>January 13th 2024</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc list-inside">
                  <li>Removed: Objekt sending, due to Ramper changes.</li>
                  <li>
                    Added: Privacy options for changing how much of your profile
                    is publicly available.
                  </li>
                  <li>
                    Added: Options to change the number of columns when
                    displaying objekts.
                  </li>
                  <li>
                    Added: Objekt indicators now show when an objekt is in a
                    lenticular pair, which prevents sending.
                  </li>
                  <li>
                    Added: Icon to indicate when a COMO drop has been carried
                    over from the previous month, due to landing on the 31st.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
