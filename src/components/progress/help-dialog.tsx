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
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import VisuallyHidden from "../ui/visually-hidden";

export default function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="rounded-full" variant="secondary" size="profile">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <VisuallyHidden>
          <AlertDialogHeader>
            <AlertDialogTitle>Help: Progress</AlertDialogTitle>
            <AlertDialogDescription>
              Help information for progress pages
            </AlertDialogDescription>
          </AlertDialogHeader>
        </VisuallyHidden>
        <div className="flex flex-col gap-4 text-sm text-foreground/80">
          {/* progress */}
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg font-semibold">Progress</h3>
            <p>
              View a seasonal breakdown of collection progress to 100%
              completion.
            </p>
            <p>
              Each member can be further broken down into just physical (A) or
              digital (Z) collections, instead of combined.
            </p>
            <p>
              Unobtainable objekts such as those from limited time events, do
              not count towards reaching 100%. If you have 100% for a
              season/class and own an unobtainable, it will be shown and your
              percentage will go over 100%.
            </p>
            <p>Progress breakdowns are updated every hour.</p>
          </div>

          {/* leaderboard */}
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-lg font-semibold">
              Leaderboard
            </h3>
            <p>
              Leaderboards display the top 25 users for the given member, which
              is based on the total number of unique collections the user has,
              not the total number of objekts they own.
            </p>
            <p>
              Leaderboard percentages completely exclude unobtainable objekts,
              so your progress percentage may differ from your leaderboard
              percentage.
            </p>
            <p>Progress percentages are recalculated every hour.</p>
            <p>Any rank ties are random and may change upon refresh.</p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
