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
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { IconHelp, IconLock, IconMailOff } from "@tabler/icons-react";
import { Button } from "../ui/button";

export default function HelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="profile">
          <IconHelp className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader className="sr-only">
          <AlertDialogTitle>{m.help_profile_title()}</AlertDialogTitle>
          <AlertDialogDescription>
            {m.help_profile_description()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4">
          {/* grid/column size */}
          <div className="flex flex-col gap-1 text-sm text-foreground/80">
            <h3 className="text-lg font-semibold text-foreground">
              {m.profile_help_grid_size_title()}
            </h3>
            <p>{m.profile_help_grid_size_desc_1()}</p>
            <p>{m.profile_help_grid_size_desc_2()}</p>
          </div>

          {/* objekt locking */}
          <div className="flex flex-col gap-1 text-sm text-foreground/80">
            <h3 className="text-lg font-semibold text-foreground">
              {m.profile_help_locking_title()}
            </h3>
            <p>{m.profile_help_locking_desc_1()}</p>
            <p>
              {m.profile_help_locking_desc_2({ appName: env.VITE_APP_NAME })}{" "}
              <b>{m.profile_help_locking_desc_emphasis()}</b>.
            </p>
          </div>

          {/* indicators */}
          <div className="flex flex-col gap-1 text-sm text-foreground/80">
            <h3 className="text-lg font-semibold text-foreground">
              {m.profile_help_indicators_title()}
            </h3>
            <p>{m.profile_help_indicators_description()}</p>
            <div className="flex flex-col gap-1 text-start">
              {/* locked */}
              <div className="flex items-center gap-2">
                <div className="flex w-fit items-center justify-center rounded-lg bg-[#FFDD00] p-1 text-black">
                  <IconLock className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold">
                  {m.profile_help_locked()}
                </p>
              </div>

              {/* not transferable */}
              <div className="flex items-center gap-2">
                <div className="flex w-fit items-center justify-center rounded-lg bg-[#75FB4C] p-1 text-black">
                  <IconMailOff className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold">
                  {m.profile_help_not_transferable()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogAction>{m.common_continue()}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
