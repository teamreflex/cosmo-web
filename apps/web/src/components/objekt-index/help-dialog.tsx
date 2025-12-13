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
          <AlertDialogTitle>{m.help_objekts_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.help_objekts_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4 text-sm text-foreground/80">
          {/* search */}
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-foreground">
              {m.help_objekts_search_title()}
            </h3>
            <p>{m.help_objekts_search_desc()}</p>
            <p>{m.help_objekts_search_examples()}</p>
            <ul className="list-inside list-disc">
              <li>{m.help_objekts_search_unit_names()}</li>
              <li>{m.help_objekts_search_s_numbers()}</li>
              <li>{m.help_objekts_search_nicknames()}</li>
              <li>{m.help_objekts_search_collections()}</li>
            </ul>
            <p>{m.help_objekts_search_description()}</p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>{m.common_continue()}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
