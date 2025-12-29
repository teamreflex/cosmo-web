import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { IconBrandGithub, IconCheck } from "@tabler/icons-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function AboutDialog({ open, onOpenChange }: Props) {
  const commitHash = env.VITE_COMMIT_SHA.slice(0, 7);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {env.VITE_APP_NAME} <span className="text-xs">ver.</span>{" "}
            <span className="text-xs text-muted-foreground">{commitHash}</span>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>{m.logo_description({ appName: env.VITE_APP_NAME })}</p>
              <p>{m.logo_source_code()}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
          <AlertDialogCancel asChild>
            <a href="https://github.com/teamreflex/cosmo-web" target="_blank">
              <IconBrandGithub />
            </a>
          </AlertDialogCancel>
          <AlertDialogAction>
            <IconCheck />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
