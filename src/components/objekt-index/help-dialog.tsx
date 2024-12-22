import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LuCircleHelp } from "react-icons/lu";
import { Button } from "../ui/button";
import { RarityPill } from "../objekt/metadata-dialog";
import VisuallyHidden from "../ui/visually-hidden";

export default function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="profile">
          <LuCircleHelp className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <VisuallyHidden>
          <AlertDialogHeader>
            <AlertDialogTitle>Help: Objekts</AlertDialogTitle>
            <AlertDialogDescription>
              Help information for objekt index
            </AlertDialogDescription>
          </AlertDialogHeader>
        </VisuallyHidden>

        <div className="flex flex-col gap-4 text-sm text-foreground/80">
          {/* index */}
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg font-semibold">Index</h3>
            <p>View a complete listing of every objekt ever released.</p>
          </div>

          {/* lists */}
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg font-semibold">Lists</h3>
            <p>
              Objekt lists allow you to create sharable links with any objekts
              you add to it.
            </p>
            <p>
              For example, you could create a list with any objekts you have
              available for trade, or any that you&apos;re looking for. Like a
              wishlist.
            </p>
          </div>

          {/* source */}
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg font-semibold">Source</h3>
            <p>
              Click an objekt to view detailed information such as edition,
              number of copies, rarity and source of the objekt.
            </p>
            <p>The rarity scale is based on the number of copies minted:</p>
            <div className="flex flex-col gap-1 *:grid *:grid-cols-3 *:items-center *:gap-2">
              {/* impossible */}
              <div>
                <RarityPill rarity="impossible" />
                <span className="col-span-2">less than 10 copies</span>
              </div>

              {/* extremely-rare */}
              <div>
                <RarityPill rarity="extremely-rare" />
                <span className="col-span-2">less than 25 copies</span>
              </div>

              {/* very-rare */}
              <div>
                <RarityPill rarity="very-rare" />
                <span className="col-span-2">less than 50 copies</span>
              </div>

              {/* rare */}
              <div>
                <RarityPill rarity="rare" />
                <span className="col-span-2">less than 100 copies</span>
              </div>

              {/* uncommon */}
              <div>
                <RarityPill rarity="uncommon" />
                <span className="col-span-2">less than 350 copies</span>
              </div>

              {/* common */}
              <div>
                <RarityPill rarity="common" />
                <span className="col-span-2">more than 350 copies</span>
              </div>
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
