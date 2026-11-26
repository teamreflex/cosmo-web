import ProfileHelp from "@/components/profile/profile-help";
import {
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { m } from "@/i18n/messages";
import { IconSparkles } from "@tabler/icons-react";

export default function HelpDialog() {
  return (
    <ProfileHelp>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogDescription className="sr-only">
            {m.help_como_description()}
          </AlertDialogDescription>
          <AlertDialogTitle>{m.help_como_title()}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div className="flex flex-col gap-1">
            <p>{m.help_como_timezone()}</p>

            <span>
              A{" "}
              <IconSparkles className="inline-block h-5 w-5 text-yellow-600" />{" "}
              {m.help_como_sparkles()}
            </span>

            <p>{m.help_como_example()}</p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>{m.common_continue()}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </ProfileHelp>
  );
}
