import { IconHelp } from "@tabler/icons-react";
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
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";

export default function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="rounded-full" variant="secondary" size="profile">
          <IconHelp className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader className="sr-only">
          <AlertDialogTitle>{m.progress_title()}</AlertDialogTitle>
          <AlertDialogDescription>{m.progress_title()}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4 text-sm text-foreground/80">
          {/* progress */}
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-foreground">
              {m.progress_title()}
            </h3>
            <p>{m.progress_help_progress_desc_1()}</p>
            <p>{m.progress_help_progress_desc_2()}</p>
            <p>{m.progress_help_progress_desc_3()}</p>
            <p>{m.progress_help_progress_desc_4()}</p>
          </div>

          {/* leaderboard */}
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-foreground">
              {m.progress_leaderboard()}
            </h3>
            <p>{m.progress_help_leaderboard_desc_1()}</p>
            <p>{m.progress_help_leaderboard_desc_2()}</p>
            <p>{m.progress_help_leaderboard_desc_3()}</p>
            <p>{m.progress_help_leaderboard_desc_4()}</p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>{m.common_continue()}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
