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
import { IconHelp } from "@tabler/icons-react";

export default function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="icon-sm">
          <IconHelp className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader className="sr-only">
          <AlertDialogTitle>{m.grid_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.grid_help_desc_1()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4 text-sm text-foreground/80">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-foreground">
              {m.grid_title()}
            </h3>
            <p>{m.grid_help_desc_1()}</p>
            <p>{m.grid_help_desc_2()}</p>
            <p>{m.grid_help_desc_3()}</p>
            <p>{m.grid_help_desc_4()}</p>
            <p>{m.grid_help_desc_5()}</p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>{m.common_continue()}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
