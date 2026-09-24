import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
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
          <AlertDialogDescription
            render={<div className="flex flex-col gap-2" />}
          >
            <p>{m.logo_description({ appName: env.VITE_APP_NAME })}</p>
            <p>{m.logo_source_code()}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
          <a
            href="https://github.com/teamreflex/cosmo-web"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={m.aria_github()}
            className={buttonVariants({ variant: "outline" })}
            onClick={() => onOpenChange(false)}
          >
            <IconBrandGithub />
          </a>
          <AlertDialogAction aria-label={m.aria_close_dialog()}>
            <IconCheck />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
