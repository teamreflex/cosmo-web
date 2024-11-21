"use client";

import { useSettingsStore } from "@/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { env } from "@/env.mjs";

export default function WarningDialog() {
  const warned = useSettingsStore((state) => state.warnings["first-visit"]);
  const toggle = useSettingsStore((state) => state.toggleWarning);

  return (
    <AlertDialog open={warned === false}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{env.NEXT_PUBLIC_APP_NAME}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            {env.NEXT_PUBLIC_APP_NAME} is an unofficial desktop client for{" "}
            <span className="italic">Cosmo: the Gate</span>, and is not
            affiliated with, endorsed by or supported by MODHAUS or its artists.
          </p>
          <p>Some features require signing in with your COSMO account.</p>
          <p>
            Viewing user profiles (collections, trades, wishlists etc){" "}
            <span className="font-bold">does not require signing in</span>.
          </p>
          <p>
            As this platform was built with desktop usage in mind, mobile usage
            may not be a perfect experience.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => toggle("first-visit")}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
